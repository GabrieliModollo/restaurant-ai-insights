"""Resumo por regras: cada frase precisa ser sustentada pelos dados do turno completo."""

import pytest

from src.simulador.parametros import CAMPOS, ParametrosSimulacao
from src.simulador.resumo import criar_resumo
from src.simulador.simulacao import executar_simulacao

PADRAO = {campo.nome: campo.padrao for campo in CAMPOS}


def _resumo(**alteracoes):
    return executar_simulacao(ParametrosSimulacao(**{**PADRAO, **alteracoes}))["resumo"]


def _texto(resumo):
    return " ".join(str(valor) for valor in resumo.values() if valor)


def test_cenario_padrao():
    resumo = _resumo()

    assert resumo["conclusao"] == "18 de 20 pedidos ficaram prontos até o fim do turno."
    assert resumo["pendentes"] == (
        "2 pedidos continuavam pendentes ao final: 0 em fila e 2 em processamento."
    )
    assert resumo["valor"] == (
        "Valor que sobra após os custos por pedido (margem de contribuição): R$ 283,50. "
        "Impostos, salários, aluguel e desperdício ainda não foram descontados."
    )
    assert resumo["atencao"] is None


def test_analise_e_identificada_como_baseada_em_regras_no_turno_completo():
    identificacao = _resumo()["identificacao"]

    assert "regras" in identificacao
    assert "sem IA conectada" in identificacao
    assert "turno completo" in identificacao


def test_zero_pedidos_nao_calcula_percentual_nem_cita_conclusao():
    resumo = _resumo(pedidos=0)

    assert resumo["conclusao"] == "Nenhum pedido foi informado para este turno."
    assert resumo["pendentes"] == "Nenhum pedido ficou em fila ou em processamento ao final."
    assert "R$ 0,00" in resumo["valor"]
    assert "%" not in _texto(resumo)


def test_nenhum_pedido_concluido():
    resumo = _resumo(pedidos=5, tempo_preparo_min=100)

    assert resumo["conclusao"] == "Nenhum dos 5 pedidos ficou pronto até o fim do turno."
    assert "Sem pedidos concluídos" in resumo["valor"]
    assert "R$ 0,00" in resumo["valor"]


def test_singular_quando_um_pedido_fica_pronto_e_um_fica_pendente():
    resumo = _resumo(pedidos=2, duracao_turno_min=10, tempo_preparo_min=2, tempo_embalagem_min=2)
    assert resumo["conclusao"] == "2 de 2 pedidos ficaram prontos até o fim do turno."

    resumo = _resumo(pedidos=2, duracao_turno_min=10, tempo_preparo_min=4, tempo_embalagem_min=4)
    assert resumo["conclusao"] == "1 de 2 pedidos ficou pronto até o fim do turno."
    assert resumo["pendentes"] == (
        "1 pedido continuava pendente ao final: 0 em fila e 1 em processamento."
    )


def test_contribuicao_igual_a_zero_com_pedidos_concluidos():
    # Líquido 20,00, sem taxa; ingredientes 18,00 e embalagem 2,00.
    resumo = _resumo(
        preco_venda=20, taxa_canal_pct=0, custo_ingredientes=18, custo_embalagem=2
    )

    assert "R$ 0,00" in resumo["valor"]
    assert "cobre exatamente" in resumo["valor"]
    assert "Sem pedidos concluídos" not in resumo["valor"]


def test_contribuicao_negativa_gera_ponto_de_atencao():
    resumo = _resumo(preco_venda=10)

    assert "negativo" in resumo["valor"]
    assert "−R$" in resumo["valor"]
    assert "Cada pedido concluído reduz o valor que sobra" in resumo["atencao"]


def test_gargalo_observado_usa_a_regra_existente():
    resumo = _resumo(pedidos=60, pessoas_embalagem=3)

    assert resumo["atencao"].startswith("Onde os pedidos estão acumulando: preparo.")


def test_gargalo_nas_duas_estacoes():
    resumo = _resumo(pedidos=120, pessoas_preparo=4)

    assert resumo["atencao"].startswith("Onde os pedidos estão acumulando: preparo e embalagem.")


def test_fila_sem_evidencia_de_sobrecarga_nao_e_chamada_de_gargalo():
    resumo = _resumo(
        pedidos=12,
        duracao_turno_min=12,
        pessoas_preparo=2,
        pessoas_embalagem=1,
        tempo_preparo_min=10,
        tempo_embalagem_min=3,
    )
    # Neste cenário o preparo é gargalo, então isola-se a regra da fila passageira.
    assert "acumulando" in resumo["atencao"]

    resumo = criar_resumo(
        {
            "contribuicao_por_pedido_centavos": 100,
            "contribuicao_total_centavos": 100,
        },
        {
            "pedidos_recebidos": 1,
            "pedidos_concluidos": 1,
            "pedidos_pendentes": 0,
            "pendentes": {
                "fila_preparo": 0,
                "em_preparo": 0,
                "fila_embalagem": 0,
                "em_embalagem": 0,
            },
            "gargalos_observados": [],
            "estacoes": {
                "preparo": {"diagnostico": "sem_fila"},
                "embalagem": {"diagnostico": "fila_temporaria"},
            },
        },
    )
    assert resumo["atencao"] == (
        "Houve fila na embalagem, mas os dados não comprovam sobrecarga nesta estação."
    )


def test_ponto_de_atencao_nao_e_inventado_quando_os_dados_nao_sustentam():
    assert _resumo()["atencao"] is None


@pytest.mark.parametrize(
    "alteracoes",
    [
        {},
        {"pedidos": 0},
        {"preco_venda": 10},
        {"pedidos": 120},
        {"pedidos": 5, "tempo_preparo_min": 100},
        {"desconto": 5},
    ],
)
def test_linguagem_proibida_e_promessas_nunca_aparecem(alteracoes):
    texto = _texto(_resumo(**alteracoes)).lower()

    for termo in ("lucro", "perdid", "vai melhorar", "melhorará", "deve contratar", "demanda"):
        assert termo not in texto


def test_textos_nao_dependem_do_relogio_da_cena():
    assert "minuto" not in _texto(_resumo()).lower()
