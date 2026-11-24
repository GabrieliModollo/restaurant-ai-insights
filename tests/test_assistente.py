"""Assistente de decisões: interpretação, proteção contra números inventados e respostas do motor."""

import json
import re

import pytest
from fastapi.testclient import TestClient

from src.simulador import assistente
from src.simulador.api import app
from src.simulador.explicacao import OllamaIndisponivel
from src.simulador.parametros import ParametrosSimulacao, campos_para_interface
from src.simulador.promocoes import ParametrosPromocao, analisar_promocao
from src.simulador.simulacao import executar_simulacao

CLIENTE = TestClient(app)
PADRAO = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}
ROTA = "/api/assistente"


def perguntar(pergunta, **alteracoes):
    resposta = CLIENTE.post(ROTA, json={"pergunta": pergunta, "cenario": {**PADRAO, **alteracoes}})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def dados(resposta):
    return {item["rotulo"]: item["valor"] for item in resposta["dados"]}


@pytest.fixture(autouse=True)
def sem_ia(monkeypatch):
    monkeypatch.delenv("RAI_IA_LOCAL", raising=False)


@pytest.mark.parametrize(("pergunta", "esperado"), [
    ("Um desconto de R$ 5 se paga?", {"intencao": "promocao", "desconto_reais": 5.0}),
    ("Vale dar 10% de desconto com 25 pedidos?", {"intencao": "promocao", "desconto_pct": 10.0, "pedidos": 25}),
    ("e se eu tirar 2,50 reais do preço?", {"intencao": "promocao", "desconto_reais": 2.5}),
    ("E se eu colocar mais uma pessoa no preparo?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1}),
    ("contratar duas pessoas na embalagem ajuda?", {"intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 2}),
    ("Quantos pedidos ficam prontos se chegarem 30?", {"intencao": "pedidos", "pedidos": 30}),
    ("Minha equipe dá conta de 40 pedidos?", {"intencao": "pedidos", "pedidos": 40}),
    ("Mais um ajudante com 40 pedidos resolve?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1, "pedidos": 40}),
    ("Quem paga o desconto no iFood?", {"intencao": "regras"}),
    ("Quanto a 99Food cobra de comissão?", {"intencao": "regras"}),
    ("e se eu der desconto?", {"intencao": "promocao"}),
    ("Qual o melhor sabor de pizza?", {"intencao": "fora_do_escopo"}),
])
def test_regras_interpretam_perguntas_comuns(pergunta, esperado):
    assert assistente.interpretar_por_regras(pergunta).model_dump(exclude_none=True) == esperado


def test_promocao_usa_os_numeros_do_motor():
    resposta = perguntar("Um desconto de R$ 5 se paga?")
    analise = analisar_promocao(ParametrosPromocao(
        base=ParametrosSimulacao.model_validate(PADRAO),
        promocional=ParametrosSimulacao.model_validate({**PADRAO, "desconto": 5}),
    ))
    assert analise["equilibrio"]["pedidos_concluidos_minimos"] == 25
    assert analise["equilibrio"]["maximo_concluidos_no_limite"] == 22
    assert dados(resposta) == {
        "Pedidos prontos necessários": "25",
        "Capacidade do turno": "22 pedidos",
        "Prontos na hipótese": "18 de 20",
        "Diferença no turno": "−R$ 76,50",
        "Maior desconto que se paga com 18 prontos": "Nenhum desconto",
    }
    assert resposta["resposta"].startswith("Não neste turno.")
    assert resposta["ferramenta"] == "analisar_promocao"
    assert resposta["origem"] == "regras" and resposta["motivo"] == "desativada"
    assert analise["alertas"] == resposta["alertas"]


def test_desconto_percentual_e_volume_partem_do_cenario_atual():
    resposta = perguntar("Vale dar 10% de desconto com 30 pedidos?", preco_venda=40)
    assert "desconto de R$ 4,00 por pedido, 30 pedidos recebidos" in resposta["entendimento"]
    assert dados(resposta)["Prontos na hipótese"] == "22 de 30"


def test_reforco_compara_o_mesmo_volume():
    resposta = perguntar("E se eu colocar mais uma pessoa no preparo?", pedidos=40)
    antes = executar_simulacao(ParametrosSimulacao.model_validate({**PADRAO, "pedidos": 40}))
    depois = executar_simulacao(ParametrosSimulacao.model_validate({**PADRAO, "pedidos": 40, "pessoas_preparo": 3}))
    prontos = (antes["operacao"]["pedidos_concluidos"], depois["operacao"]["pedidos_concluidos"])
    assert prontos[1] > prontos[0]
    assert dados(resposta)["Pedidos prontos"] == f"{prontos[0]} → {prontos[1]}"
    assert any("custo da pessoa extra" in alerta for alerta in resposta["alertas"])


def test_reforco_sem_efeito_aponta_a_outra_estacao():
    resposta = perguntar("contratar duas pessoas na embalagem ajuda?")
    assert "continuam 18" in resposta["resposta"]
    assert "menor capacidade é preparo" in resposta["resposta"]


def test_regras_comerciais_citam_fontes():
    resposta = perguntar("Quem paga o desconto no iFood?")
    assert resposta["ferramenta"] == "consultar_regras"
    assert resposta["fontes"] and all(fonte["url"].startswith("https://") for fonte in resposta["fontes"])


@pytest.mark.parametrize(("pergunta", "trecho"), [
    ("e se eu der desconto?", "Qual desconto você quer testar?"),
    ("Qual o melhor sabor de pizza?", "Ainda não sei responder isso."),
    ("desconto de R$ 50 se paga?", "O desconto não pode ser maior que o preço."),
])
def test_perguntas_sem_calculo_possivel_tem_resposta_propria(pergunta, trecho):
    resposta = perguntar(pergunta)
    assert trecho in resposta["resposta"]
    assert resposta["dados"] == []


def test_toda_resposta_usa_apenas_numeros_calculados_ou_da_pergunta():
    pergunta = "dar 2 reais de desconto com 30 pedidos"
    resposta = perguntar(pergunta)
    analise = analisar_promocao(ParametrosPromocao(
        base=ParametrosSimulacao.model_validate(PADRAO),
        promocional=ParametrosSimulacao.model_validate({**PADRAO, "desconto": 2, "pedidos": 30}),
    ))
    texto = json.dumps(analise, ensure_ascii=False)
    calculados = {int(n) for n in re.findall(r"-?\d+", texto)}
    calculados |= {abs(n) // 100 for n in calculados} | {abs(n) % 100 for n in calculados}
    for numero in re.findall(r"\d+", resposta["resposta"] + json.dumps(resposta["dados"], ensure_ascii=False)):
        assert int(numero) in calculados | {2, 30}, numero


def _com_modelo(monkeypatch, resposta_modelo):
    monkeypatch.setenv("RAI_IA_LOCAL", "1")

    def modelo(_pergunta):
        if isinstance(resposta_modelo, Exception):
            raise resposta_modelo
        return resposta_modelo

    monkeypatch.setattr(assistente, "consultar_modelo", modelo)


def test_interpretacao_da_ia_e_usada_quando_valida(monkeypatch):
    _com_modelo(monkeypatch, '{"intencao":"promocao","desconto_reais":5,"pedidos":null,"estacao":null,"pessoas_a_mais":null,"desconto_pct":null}')
    resposta = perguntar("Se eu baixar cinco reais no preço compensa?")
    assert resposta["origem"] == "ia_local"
    assert resposta["modelo"] == "qwen2.5:1.5b"
    assert dados(resposta)["Pedidos prontos necessários"] == "25"


def test_ia_entende_numero_por_extenso(monkeypatch):
    _com_modelo(monkeypatch, '{"intencao":"equipe","estacao":"embalagem","pessoas_a_mais":2}')
    resposta = perguntar("Se eu puser duas pessoas a mais pra embalar melhora?")
    assert resposta["origem"] == "ia_local"
    assert "+2 pessoas na embalagem" in resposta["entendimento"]


@pytest.mark.parametrize(("resposta_modelo", "motivo"), [
    (OllamaIndisponivel(), "indisponivel"),
    ("isto não é JSON", "resposta_invalida"),
    ('{"intencao":"promocao","desconto_reais":5,"inventado":1}', "resposta_invalida"),
    ('{"intencao":"promocao","desconto_reais":8}', "numero_nao_citado"),
    ('{"intencao":"pedidos","pedidos":45}', "numero_nao_citado"),
])
def test_falhas_da_ia_voltam_para_as_regras(monkeypatch, resposta_modelo, motivo):
    _com_modelo(monkeypatch, resposta_modelo)
    resposta = perguntar("Um desconto de R$ 5 se paga?")
    assert resposta["origem"] == "regras"
    assert resposta["motivo"] == motivo
    assert dados(resposta)["Pedidos prontos necessários"] == "25"


@pytest.mark.parametrize(("corpo", "campo"), [
    ({"pergunta": "oi", "cenario": PADRAO}, "pergunta"),
    ({"pergunta": "x" * 301, "cenario": PADRAO}, "pergunta"),
    ({"pergunta": "Desconto de R$ 5?", "cenario": {**PADRAO, "pedidos": -1}}, "cenario.pedidos"),
    ({"pergunta": "Desconto de R$ 5?"}, "cenario"),
])
def test_entrada_invalida_recebe_erro_por_campo(corpo, campo):
    resposta = CLIENTE.post(ROTA, json=corpo)
    assert resposta.status_code == 422
    assert campo in resposta.json()["erros"]


def test_campos_que_a_ia_esquece_sao_completados_pelo_texto(monkeypatch):
    _com_modelo(monkeypatch, '{"intencao":"equipe","pessoas_a_mais":2}')
    resposta = perguntar("contratar duas pessoas na embalagem ajuda?")
    assert resposta["origem"] == "ia_local"
    assert resposta["interpretacao"] == {"intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 2}


def test_interpretacao_incompleta_da_ia_cede_para_regras_completas(monkeypatch):
    _com_modelo(monkeypatch, '{"intencao":"promocao","pedidos":50}')
    resposta = perguntar("E se o movimento subir para 50 pedidos no turno?")
    assert resposta["origem"] == "regras" and resposta["motivo"] == "interpretacao_incompleta"
    assert resposta["interpretacao"] == {"intencao": "pedidos", "pedidos": 50}


def test_avaliacao_por_regras_roda_sem_ia():
    from scripts.avaliar_assistente import CASOS, avaliar
    relatorio = avaliar(False, CASOS)
    assert relatorio["respostas_da_ia"] == 0
    assert relatorio["acertos_regras"] == relatorio["acertos_finais"] >= 19
