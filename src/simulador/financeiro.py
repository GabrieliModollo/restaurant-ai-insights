"""Cálculos financeiros em centavos inteiros.

Regra de arredondamento: a taxa do canal é calculada por pedido e arredondada ao
centavo, com meio centavo para cima (ROUND_HALF_UP). Os totais multiplicam o valor
já arredondado, então "total = valor por pedido × pedidos" sempre fecha exatamente.
"""

from decimal import ROUND_HALF_UP, Decimal


def _para_centavos(valor: Decimal) -> int:
    return int((valor * 100).to_integral_value(rounding=ROUND_HALF_UP))


def calcular_financeiro(
    *,
    preco_venda: Decimal,
    desconto: Decimal,
    taxa_canal_pct: Decimal,
    custo_ingredientes: Decimal,
    custo_embalagem: Decimal,
    pedidos_concluidos: int,
) -> dict:
    preco_liquido = _para_centavos(preco_venda) - _para_centavos(desconto)
    taxa_canal = int(
        (Decimal(preco_liquido) * taxa_canal_pct / 100).to_integral_value(rounding=ROUND_HALF_UP)
    )
    contribuicao_por_pedido = (
        preco_liquido
        - taxa_canal
        - _para_centavos(custo_ingredientes)
        - _para_centavos(custo_embalagem)
    )

    return {
        "preco_liquido_centavos": preco_liquido,
        "taxa_canal_centavos": taxa_canal,
        "contribuicao_por_pedido_centavos": contribuicao_por_pedido,
        "receita_atendida_centavos": preco_liquido * pedidos_concluidos,
        "contribuicao_total_centavos": contribuicao_por_pedido * pedidos_concluidos,
    }
