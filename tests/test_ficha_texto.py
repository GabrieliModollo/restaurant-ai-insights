"""Ficha técnica a partir de texto: regras, proteção contra números inventados e revisão antes do cálculo."""

import json

import pytest
from fastapi.testclient import TestClient

from src.simulador import ficha_texto
from src.simulador.api import app
from src.simulador.explicacao import OllamaIndisponivel

CLIENTE = TestClient(app)
ROTA = "/api/ficha-tecnica/texto"
RECEITA = """Massa de pizza (1 porção)
Farinha: 150 g por porção, pacote de 1 kg por R$ 20
- Queijo mussarela - usa 80g - peça de 1 kg custa R$ 42,90
2 ovos, dúzia a R$ 12,00
Molho de tomate 120 ml, caixa de 1 L a R$ 9,50
120 g de calabresa (pacote 2,5 kg R$ 89,90)
Azeite: 10 ml, garrafa 500 ml R$ 32
Sal a gosto"""
ESPERADO = [
    ("Farinha", 2000, 1, "kg", 150, "g"),
    ("Queijo mussarela", 4290, 1, "kg", 80, "g"),
    ("Ovos", 1200, 12, "un", 2, "un"),
    ("Molho de tomate", 950, 1, "l", 120, "ml"),
    ("Calabresa", 8990, 2.5, "kg", 120, "g"),
    ("Azeite", 3200, 500, "ml", 10, "ml"),
]


@pytest.fixture(autouse=True)
def sem_ia(monkeypatch):
    monkeypatch.delenv("RAI_IA_LOCAL", raising=False)


def extrair(texto=RECEITA, **extra):
    resposta = CLIENTE.post(ROTA, json={"texto": texto, "data_preco": "2026-11-25", **extra})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _resumo(ingredientes):
    return [(i["nome"], i["preco_compra_centavos"], i["quantidade_comprada"], i["unidade_compra"],
             i["quantidade_usada"], i["unidade_uso"]) for i in ingredientes]


def test_regras_extraem_formatos_comuns_e_ignoram_linhas_sem_preco():
    dados = extrair()
    assert _resumo(dados["ingredientes"]) == ESPERADO
    assert all(i["data_preco"] == "2026-11-25" for i in dados["ingredientes"])
    assert dados["linhas_ignoradas"] == ["Massa de pizza (1 porção)"]
    assert (dados["origem"], dados["motivo"]) == ("regras", "desativada")


def test_ingredientes_extraidos_seguem_para_o_calculo_de_sempre():
    ingredientes = extrair()["ingredientes"]
    calculo = CLIENTE.post("/api/ficha-tecnica", json={"ingredientes": ingredientes}).json()
    # 3,00 + 3,432 + 2,00 + 1,14 + 4,3152 + 0,64 = 14,5272 → R$ 14,53
    assert calculo["total_centavos"] == 1453


def test_unidades_incompativeis_nao_viram_ingrediente():
    dados = extrair("Leite: 200 g, caixa de 1 L por R$ 5")
    assert dados["ingredientes"] == []
    assert dados["linhas_ignoradas"] == ["Leite"]


@pytest.mark.parametrize("texto", ["oi", "x" * 4001])
def test_texto_fora_dos_limites_recebe_erro_por_campo(texto):
    resposta = CLIENTE.post(ROTA, json={"texto": texto})
    assert resposta.status_code == 422
    assert "texto" in resposta.json()["erros"]


def _com_modelo(monkeypatch, resposta):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")

    def modelo(_texto):
        if isinstance(resposta, Exception):
            raise resposta
        return resposta if isinstance(resposta, str) else json.dumps(resposta)

    monkeypatch.setattr(ficha_texto, "consultar_modelo", modelo)


def _item(nome, preco, comprada, un_compra, usada, un_uso):
    return {"nome": nome, "preco_reais": preco, "quantidade_comprada": comprada, "unidade_compra": un_compra,
            "quantidade_usada": usada, "unidade_uso": un_uso}


def test_ia_entende_frase_que_as_regras_nao_leem(monkeypatch):
    texto = "Na receita vão duzentas gramas de presunto, que compro a R$ 38 o quilo"
    assert extrair(texto)["ingredientes"] == []
    _com_modelo(monkeypatch, {"ingredientes": [_item("Presunto", 38, 1, "kg", 200, "g")]})
    dados = extrair(texto.replace("duzentas gramas", "200 gramas"))
    assert dados["origem"] == "ia_local"
    assert _resumo(dados["ingredientes"]) == [("Presunto", 3800, 1, "kg", 200, "g")]


@pytest.mark.parametrize(("resposta", "motivo"), [
    (OllamaIndisponivel(), "indisponivel"),
    ("não é JSON", "resposta_invalida"),
    ({"ingredientes": []}, "resposta_vazia"),
    ({"ingredientes": [_item("Farinha", 25, 1, "kg", 150, "g")]}, "numero_nao_citado"),
    ({"ingredientes": [_item("Leite", 20, 1, "l", 150, "g")]}, "resposta_invalida"),
])
def test_falhas_da_ia_voltam_para_as_regras(monkeypatch, resposta, motivo):
    _com_modelo(monkeypatch, resposta)
    dados = extrair()
    assert (dados["origem"], dados["motivo"]) == ("regras", motivo)
    assert _resumo(dados["ingredientes"]) == ESPERADO


def test_duzia_conta_como_doze_sem_estar_escrito(monkeypatch):
    _com_modelo(monkeypatch, {"ingredientes": [_item("Ovos", 12, 12, "un", 2, "un")]})
    dados = extrair("2 ovos, dúzia a R$ 12")
    assert dados["origem"] == "ia_local"


@pytest.mark.parametrize(("texto", "esperado"), [
    ("Presunto: 200 g, R$ 38 o quilo", ("Presunto", 3800, 1, "kg", 200, "g")),
    ("Leite: 150 ml, R$ 5 por litro", ("Leite", 500, 1, "l", 150, "ml")),
    ("Bacon 30 g R$ 60/kg", ("Bacon", 6000, 1, "kg", 30, "g")),
])
def test_preco_por_unidade_implica_compra_de_uma_unidade(texto, esperado):
    assert _resumo(extrair(texto)["ingredientes"]) == [esperado]
