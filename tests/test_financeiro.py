from decimal import Decimal

from src.simulador.financeiro import calcular_financeiro


def _calcular(**alteracoes):
    dados = {
        "preco_venda": Decimal("30"),
        "desconto": Decimal("5"),
        "taxa_canal_pct": Decimal("12"),
        "custo_ingredientes": Decimal("10"),
        "custo_embalagem": Decimal("2"),
        "pedidos_concluidos": 4,
    }
    return calcular_financeiro(**{**dados, **alteracoes})


def test_formulas_do_enunciado():
    resultado = _calcular()

    assert resultado["preco_liquido_centavos"] == 2500
    assert resultado["taxa_canal_centavos"] == 300
    assert resultado["contribuicao_por_pedido_centavos"] == 1000
    assert resultado["receita_atendida_centavos"] == 10000
    assert resultado["contribuicao_total_centavos"] == 4000


def test_meio_centavo_arredonda_para_cima():
    # 10,10 × 5% = 0,505. O arredondamento bancário daria 0,50.
    resultado = _calcular(preco_venda=Decimal("10.10"), desconto=Decimal("0"), taxa_canal_pct=Decimal("5"))

    assert resultado["taxa_canal_centavos"] == 51


def test_abaixo_de_meio_centavo_arredonda_para_baixo():
    # 10,05 × 2,5% = 0,25125.
    resultado = _calcular(preco_venda=Decimal("10.05"), desconto=Decimal("0"), taxa_canal_pct=Decimal("2.5"))

    assert resultado["taxa_canal_centavos"] == 25


def test_total_usa_a_contribuicao_ja_arredondada():
    resultado = _calcular(
        preco_venda=Decimal("10.10"),
        desconto=Decimal("0"),
        taxa_canal_pct=Decimal("5"),
        pedidos_concluidos=3,
    )

    assert (
        resultado["contribuicao_total_centavos"]
        == resultado["contribuicao_por_pedido_centavos"] * 3
    )


def test_contribuicao_negativa_e_preservada():
    resultado = _calcular(desconto=Decimal("20"), pedidos_concluidos=2)

    # Líquido 10,00; taxa 1,20; ingredientes 10,00; embalagem 2,00.
    assert resultado["contribuicao_por_pedido_centavos"] == -320
    assert resultado["contribuicao_total_centavos"] == -640
    assert resultado["receita_atendida_centavos"] == 2000


def test_desconto_igual_ao_preco_zera_receita_mas_nao_os_custos():
    resultado = _calcular(desconto=Decimal("30"))

    assert resultado["preco_liquido_centavos"] == 0
    assert resultado["taxa_canal_centavos"] == 0
    assert resultado["receita_atendida_centavos"] == 0
    assert resultado["contribuicao_por_pedido_centavos"] == -1200


def test_zero_pedidos_concluidos_zera_totais_e_mantem_valor_por_pedido():
    resultado = _calcular(pedidos_concluidos=0)

    assert resultado["receita_atendida_centavos"] == 0
    assert resultado["contribuicao_total_centavos"] == 0
    assert resultado["contribuicao_por_pedido_centavos"] == 1000
