"""Une validação, filas e finanças: a receita depende do que a operação concluiu."""

from src.simulador.parametros import CAMPOS, ParametrosSimulacao
from src.simulador.simulacao import executar_simulacao

PADRAO = {campo.nome: campo.padrao for campo in CAMPOS}


def _executar(**alteracoes):
    return executar_simulacao(ParametrosSimulacao(**{**PADRAO, **alteracoes}))


def test_cenario_padrao():
    resultado = _executar()
    financeiro = resultado["financeiro"]
    operacao = resultado["operacao"]

    # 20 pedidos chegam a cada 3 min e levam 7 min: 18 terminam até o minuto 60.
    assert operacao["pedidos_concluidos"] == 18
    assert operacao["pedidos_pendentes"] == 2
    assert len(operacao["eventos"]) == 96
    # Líquido 35,00; taxa 5,25; ingredientes 12,00; embalagem 2,00.
    assert financeiro["contribuicao_por_pedido_centavos"] == 1575
    assert financeiro["contribuicao_total_centavos"] == 28350
    assert financeiro["receita_atendida_centavos"] == 63000


def test_receita_e_contribuicao_consideram_so_pedidos_concluidos():
    resultado = _executar(pedidos=120, pessoas_preparo=1, pessoas_embalagem=1)
    financeiro = resultado["financeiro"]
    operacao = resultado["operacao"]
    concluidos = sum(evento["tipo"] == "fim_embalagem" for evento in operacao["eventos"])

    assert operacao["pedidos_pendentes"] > 0
    assert operacao["pedidos_concluidos"] == concluidos
    assert (
        financeiro["receita_atendida_centavos"]
        == financeiro["preco_liquido_centavos"] * concluidos
    )
    assert (
        financeiro["contribuicao_total_centavos"]
        == financeiro["contribuicao_por_pedido_centavos"] * concluidos
    )


def test_desconto_nao_altera_a_operacao():
    sem_desconto = _executar(pedidos=26, desconto=0)["operacao"]
    com_desconto = _executar(pedidos=26, desconto=5)["operacao"]

    assert com_desconto == sem_desconto


def test_zero_pedidos_zera_totais_e_mantem_valor_por_pedido():
    resultado = _executar(pedidos=0)

    assert resultado["financeiro"]["receita_atendida_centavos"] == 0
    assert resultado["financeiro"]["contribuicao_total_centavos"] == 0
    assert resultado["financeiro"]["contribuicao_por_pedido_centavos"] == 1575
    assert resultado["operacao"]["eventos"] == []


def test_contribuicao_negativa_chega_ao_resultado():
    financeiro = _executar(preco_venda=10, desconto=5)["financeiro"]

    assert financeiro["contribuicao_por_pedido_centavos"] < 0
    assert financeiro["contribuicao_total_centavos"] < 0
    assert financeiro["receita_atendida_centavos"] > 0
