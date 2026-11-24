"""Portão de qualidade do assistente: casos versionados, detector de números e cenários aleatórios."""

import random
from decimal import Decimal

import pytest

from scripts import avaliar_assistente as avaliacao
from src.simulador import assistente
from src.simulador.parametros import CAMPOS

PERGUNTAS = (
    *assistente.EXEMPLOS,
    "Vale dar 10% de desconto com 40 pedidos?",
    "Contratar duas pessoas na embalagem ajuda?",
)


@pytest.fixture(autouse=True)
def sem_ia(monkeypatch):
    monkeypatch.setenv("RAI_IA_LOCAL", "0")


def test_casos_versionados_passam_no_portao():
    dados = avaliacao.carregar()
    relatorio = avaliacao.avaliar(False, dados["casos"])
    assert avaliacao.falhas(relatorio, dados["minimos_regras"]) == []


def test_casos_tem_identificadores_unicos_e_conjuntos_conhecidos():
    casos = avaliacao.carregar()["casos"]
    assert len({caso["id"] for caso in casos}) == len(casos)
    assert {caso["conjunto"] for caso in casos} == {"ajuste", "novos", "robustez"}


def test_detector_aponta_numero_que_nao_veio_do_motor(monkeypatch):
    original = assistente.responder

    def inventa(entrada):
        resposta = original(entrada)
        return {**resposta, "resposta": resposta["resposta"] + " O lucro será de R$ 999,99."}

    monkeypatch.setattr(assistente, "responder", inventa)
    caso = {"id": "x", "conjunto": "teste", "pergunta": "Um desconto de R$ 5 se paga?",
            "esperado": {"intencao": "promocao", "desconto_reais": 5}}
    resultado = avaliacao.avaliar_caso(caso)
    assert resultado["fidelidade"] is False
    assert resultado["numeros_sem_origem"] == ["999.99"]


def test_detector_aceita_numeros_da_pergunta_e_do_motor():
    caso = {"id": "x", "conjunto": "teste", "pergunta": "dar 2 reais de desconto com 30 pedidos",
            "esperado": {"intencao": "promocao", "desconto_reais": 2, "pedidos": 30}}
    assert avaliacao.avaliar_caso(caso)["fidelidade"] is True


def test_numeros_exibidos_entende_formato_brasileiro():
    assert avaliacao.numeros_exibidos("−R$ 1.234,50 e 22 pedidos na 99Food") == {Decimal("1234.50"), Decimal("22")}


def _cenario_aleatorio(gerador: random.Random) -> dict:
    """Valores dentro dos limites, incluindo custos acima do preço e equipes mínimas."""
    def sortear(nome):
        campo = next(campo for campo in CAMPOS if campo.nome == nome)
        topo = float(campo.maximo_slider)
        if campo.casas == 0:
            return gerador.randint(int(campo.minimo), int(topo))
        return round(gerador.uniform(max(float(campo.minimo), 0.5), topo) * 2) / 2

    cenario = {campo.nome: sortear(campo.nome) for campo in CAMPOS}
    cenario["desconto"] = min(cenario["desconto"], cenario["preco_venda"])
    return cenario


@pytest.mark.parametrize("semente", range(30))
def test_cenarios_aleatorios_nao_quebram_nem_inventam_numeros(semente):
    gerador = random.Random(semente)
    cenario = _cenario_aleatorio(gerador)
    for pergunta in PERGUNTAS:
        caso = {"id": f"s{semente}", "conjunto": "aleatorio", "pergunta": pergunta, "cenario": cenario,
                "esperado": {"intencao": "fora_do_escopo"}}
        resultado = avaliacao.avaliar_caso(caso)
        assert "erro" not in resultado, (cenario, pergunta, resultado.get("erro"))
        assert resultado["fidelidade"], (cenario, pergunta, resultado["numeros_sem_origem"])
