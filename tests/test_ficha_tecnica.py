import pytest
from fastapi.testclient import TestClient

from src.simulador.api import app
from src.simulador.parametros import campos_para_interface

cliente = TestClient(app)
INGREDIENTE = {
    "nome": "Farinha",
    "preco_compra_centavos": 2000,
    "quantidade_comprada": 1,
    "unidade_compra": "kg",
    "quantidade_usada": 150,
    "unidade_uso": "g",
    "data_preco": "2026-11-24",
}


def calcular(*ingredientes):
    return cliente.post("/api/ficha-tecnica", json={"ingredientes": ingredientes})


def test_converte_medidas_e_aplica_total_ao_contrato_atual_da_simulacao():
    oleo = {
        **INGREDIENTE, "nome": "Óleo", "preco_compra_centavos": 1250,
        "quantidade_comprada": 0.5, "unidade_compra": "l",
        "quantidade_usada": 30, "unidade_uso": "ml",
    }
    ovo = {
        **INGREDIENTE, "nome": "Ovo", "preco_compra_centavos": 600,
        "quantidade_comprada": 6, "unidade_compra": "un",
        "quantidade_usada": 1, "unidade_uso": "un",
    }
    resposta = calcular(INGREDIENTE, oleo, ovo)
    assert resposta.status_code == 200
    assert resposta.json() == {
        "total_centavos": 475,
        "aplicavel_ao_simulador": True,
        "itens": [
            {"nome": "Farinha", "custo_reais": 3.0, "data_preco": "2026-11-24"},
            {"nome": "Óleo", "custo_reais": 0.75, "data_preco": "2026-11-24"},
            {"nome": "Ovo", "custo_reais": 1.0, "data_preco": "2026-11-24"},
        ],
    }
    padrao = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}
    simulacao = cliente.post(
        "/api/simulacoes", json={**padrao, "custo_ingredientes": resposta.json()["total_centavos"] / 100},
    )
    assert simulacao.status_code == 200
    assert simulacao.json()["financeiro"]["contribuicao_por_pedido_centavos"] == 2300


def test_arredonda_depois_de_somar_os_ingredientes():
    item = {**INGREDIENTE, "preco_compra_centavos": 1, "quantidade_usada": 500}
    assert calcular(item, item).json()["total_centavos"] == 1


@pytest.mark.parametrize(("alteracoes", "caminho"), [
    ({"unidade_uso": "ml"}, "ingredientes.0"),
    ({"data_preco": "2026-02-30"}, "ingredientes.0.data_preco"),
    ({"quantidade_comprada": 0}, "ingredientes.0.quantidade_comprada"),
    ({"quantidade_usada": 0.1234}, "ingredientes.0.quantidade_usada"),
    ({"quantidade_usada": True}, "ingredientes.0.quantidade_usada"),
    ({"quantidade_usada": "150"}, "ingredientes.0.quantidade_usada"),
])
def test_rejeita_entradas_invalidas_com_caminho_do_ingrediente(alteracoes, caminho):
    resposta = calcular({**INGREDIENTE, **alteracoes})
    assert resposta.status_code == 422
    assert any(chave.startswith(caminho) for chave in resposta.json()["erros"])


def test_total_acima_do_limite_pode_ser_consultado_mas_nao_aplicado():
    item = {**INGREDIENTE, "preco_compra_centavos": 100_001, "quantidade_usada": 1000}
    assert calcular(item).json()["aplicavel_ao_simulador"] is False
