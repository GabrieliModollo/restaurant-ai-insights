"""Ponto de entrada do núcleo: parâmetros validados → operação → finanças.

A operação roda primeiro porque receita e contribuição só contam pedidos concluídos.
Os cálculos confiam nos parâmetros: a validação fica apenas em ParametrosSimulacao.
"""

from fractions import Fraction

from .financeiro import calcular_financeiro
from .operacao import EMBALAGEM, PREPARO, simular_operacao
from .parametros import ParametrosSimulacao
from .resumo import criar_resumo


def _operacao(parametros: ParametrosSimulacao, fracao_turno_chegadas: Fraction = Fraction(1)) -> dict:
    return simular_operacao(
        pedidos=parametros.pedidos,
        duracao_turno_min=parametros.duracao_turno_min,
        pessoas_preparo=parametros.pessoas_preparo,
        pessoas_embalagem=parametros.pessoas_embalagem,
        tempo_preparo_min=parametros.tempo_preparo_min,
        tempo_embalagem_min=parametros.tempo_embalagem_min,
        fracao_turno_chegadas=fracao_turno_chegadas,
    )


def executar_simulacao(parametros: ParametrosSimulacao) -> dict:
    operacao = _operacao(parametros)
    financeiro = calcular_financeiro(
        preco_venda=parametros.preco_venda,
        desconto=parametros.desconto,
        taxa_canal_pct=parametros.taxa_canal_pct,
        custo_ingredientes=parametros.custo_ingredientes,
        custo_embalagem=parametros.custo_embalagem,
        pedidos_concluidos=operacao["pedidos_concluidos"],
    )
    return {
        "financeiro": financeiro,
        "operacao": operacao,
        "resumo": criar_resumo(financeiro, operacao),
    }


def comparar_pico(parametros: ParametrosSimulacao) -> dict:
    def indicadores(fracao: Fraction) -> dict:
        operacao = _operacao(parametros, fracao)
        return {
            "janela_chegadas_min": float(Fraction(parametros.duracao_turno_min) * fracao),
            "pedidos_prontos": operacao["pedidos_concluidos"],
            "pedidos_pendentes": operacao["pedidos_pendentes"],
            "espera_media_fila_min": operacao["espera_media_fila_min"],
            "fila_maxima_preparo": operacao["estacoes"][PREPARO]["fila_maxima"],
            "fila_maxima_embalagem": operacao["estacoes"][EMBALAGEM]["fila_maxima"],
        }

    return {
        "pedidos_recebidos": parametros.pedidos,
        "duracao_turno_min": parametros.duracao_turno_min,
        "distribuido": indicadores(Fraction(1)),
        "pico": indicadores(Fraction(1, 4)),
    }
