"""Ponto de entrada do núcleo: parâmetros validados → operação → finanças.

A operação roda primeiro porque receita e contribuição só contam pedidos concluídos.
Os cálculos confiam nos parâmetros: a validação fica apenas em ParametrosSimulacao.
"""

from .financeiro import calcular_financeiro
from .operacao import simular_operacao
from .parametros import ParametrosSimulacao


def executar_simulacao(parametros: ParametrosSimulacao) -> dict:
    operacao = simular_operacao(
        pedidos=parametros.pedidos,
        duracao_turno_min=parametros.duracao_turno_min,
        pessoas_preparo=parametros.pessoas_preparo,
        pessoas_embalagem=parametros.pessoas_embalagem,
        tempo_preparo_min=parametros.tempo_preparo_min,
        tempo_embalagem_min=parametros.tempo_embalagem_min,
    )
    financeiro = calcular_financeiro(
        preco_venda=parametros.preco_venda,
        desconto=parametros.desconto,
        taxa_canal_pct=parametros.taxa_canal_pct,
        custo_ingredientes=parametros.custo_ingredientes,
        custo_embalagem=parametros.custo_embalagem,
        pedidos_concluidos=operacao["pedidos_concluidos"],
    )
    return {"financeiro": financeiro, "operacao": operacao}
