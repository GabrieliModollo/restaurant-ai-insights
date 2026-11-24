import json

import pytest
from fastapi.testclient import TestClient

from src.simulador import explicacao
from src.simulador.api import app
from src.simulador.parametros import campos_para_interface

CLIENTE = TestClient(app)
PADRAO = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}
ROTA = "/api/promocoes/explicacao"


def enviar(**alteracoes):
    return CLIENTE.post(ROTA, json={"base": PADRAO, "promocional": {**PADRAO, **alteracoes}})


@pytest.mark.parametrize(("alteracoes", "trechos"), [
    ({"desconto": 5}, ["20 pedidos recebidos", "18 foram concluídos", "25 pedidos concluídos", "capacidade do turno é de 22"]),
    ({"desconto": 25}, ["−R$ 5,50", "reduz a contribuição total"]),
    ({"desconto": 5, "pedidos": 28, "duracao_turno_min": 120}, ["60 minutos", "120 minutos", "períodos de durações diferentes"]),
])
def test_explicacao_padrao_usa_regras_e_numeros_da_api(monkeypatch, alteracoes, trechos):
    monkeypatch.delenv("RAI_IA_LOCAL", raising=False)
    resposta = enviar(**alteracoes).json()
    assert resposta["origem"] == "regras"
    assert resposta["motivo"] == "desativada"
    assert all(trecho in resposta["texto"] for trecho in trechos)


def test_resposta_do_modelo_preserva_a_origem_e_os_fatos(monkeypatch):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")

    def modelo(opcoes):
        assert "menor do que a meta" in opcoes["padrao"]
        assert "menos pedidos do que a meta exige" in opcoes["simples"]
        return json.dumps({"versao": "simples"})

    monkeypatch.setattr(explicacao, "consultar_ollama", modelo)
    corpo = enviar(desconto=5).json()
    assert corpo["origem"] == "ia_local"
    assert corpo["modelo"] == explicacao.MODELO
    assert "25 pedidos concluídos" in corpo["texto"]
    assert "a equipe consegue concluir menos pedidos do que a meta exige" in corpo["texto"]


def test_modelo_pode_escolher_a_versao_original(monkeypatch):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")
    monkeypatch.setattr(explicacao, "consultar_ollama", lambda *_: '{"versao":"padrao"}')
    corpo = enviar(desconto=5).json()
    assert corpo["origem"] == "regras"
    assert corpo["motivo"] == "preferiu_regras"
    assert "menor do que a meta" in corpo["texto"]


@pytest.mark.parametrize(("desconto", "frase", "esperado"), [
    (5, "A capacidade é suficiente para alcançar a meta neste turno.", "menor do que a meta"),
    (25, "Vender mais não reduz a contribuição total.", "reduz a contribuição total"),
    (25, "A contribuição de cada pedido é positiva.", "é negativa"),
])
def test_conclusoes_contraditorias_acionam_regras(monkeypatch, desconto, frase, esperado):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")
    monkeypatch.setattr(explicacao, "consultar_ollama", lambda *_: json.dumps({"versao": "simples", "explicacao": frase}))
    corpo = enviar(desconto=desconto).json()
    assert corpo["origem"] == "regras"
    assert corpo["motivo"] == "resposta_invalida"
    assert esperado in corpo["texto"]
    assert frase not in corpo["texto"]



@pytest.mark.parametrize("texto_modelo", [
    "resposta ilegível",
    '{"explicacao":"Só 70% dos pedidos foram concluídos."}',
    '{"explicacao":"A promoção garante lucro para o restaurante."}',
    '{"explicacao":"A operacão atinge a marca de R$ 5,00."}',
    '{"explicacao":"A meta está <strong>acima</strong> da capacidade."}',
])
def test_resposta_invalida_cai_para_regras(monkeypatch, texto_modelo):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")
    monkeypatch.setattr(explicacao, "consultar_ollama", lambda *_: texto_modelo)
    corpo = enviar(desconto=5).json()
    assert corpo["motivo"] == "resposta_invalida"
    assert "capacidade do turno é de 22" in corpo["texto"]


def test_ollama_indisponivel_cai_para_regras(monkeypatch):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")

    def indisponivel(*_):
        raise explicacao.OllamaIndisponivel

    monkeypatch.setattr(explicacao, "consultar_ollama", indisponivel)
    assert enviar(desconto=5).json()["motivo"] == "indisponivel"


def test_explicacao_rejeita_cenario_com_desconto_invalido():
    resposta = enviar(desconto=100)
    assert resposta.status_code == 422
    assert "promocional.desconto" in resposta.json()["erros"]


def test_evitar_atribuir_diferenca_de_turnos_ao_desconto(monkeypatch):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")
    monkeypatch.setattr(explicacao, "consultar_ollama", lambda *_:
                        '{"explicacao":"Em turnos diferentes, o desconto foi eficaz."}')
    corpo = enviar(desconto=5, pedidos=28, duracao_turno_min=120).json()
    assert corpo["motivo"] == "resposta_invalida"
    assert "efeito isolado do desconto" in corpo["texto"]
