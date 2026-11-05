"""Une validação, filas e finanças: a receita depende do que a operação concluiu."""

import json
from pathlib import Path

from src.simulador.parametros import CAMPOS, ParametrosSimulacao, exemplos_para_interface
from src.simulador.simulacao import executar_simulacao

PADRAO = {campo.nome: campo.padrao for campo in CAMPOS}

# Resultados reais do núcleo, usados pelos testes de JavaScript em tests/js/.
ARQUIVO_DA_FIXTURE = Path(__file__).parent / "fixtures" / "simulacoes.json"
CENARIOS_DA_FIXTURE = {
    "padrao": {},
    "gargalo_na_embalagem": {
        "pedidos": 30,
        "pessoas_preparo": 2,
        "tempo_preparo_min": 1,
        "tempo_embalagem_min": 3,
    },
    "eventos_simultaneos": {
        "pedidos": 4,
        "duracao_turno_min": 4,
        "pessoas_preparo": 1,
        "tempo_preparo_min": 2,
        "tempo_embalagem_min": 1,
    },
    "fim_exato": {"pedidos": 1, "tempo_preparo_min": 30, "tempo_embalagem_min": 30},
    "sem_pedidos": {"pedidos": 0},
}


def resultado_da_fixture(alteracoes):
    resultado = executar_simulacao(ParametrosSimulacao(**{**PADRAO, **alteracoes}))
    return json.loads(json.dumps(resultado))


def _executar_exemplo(identificador):
    exemplo = next(item for item in exemplos_para_interface() if item["id"] == identificador)
    return executar_simulacao(ParametrosSimulacao(**exemplo["parametros"]))


def test_ha_tres_exemplos_ficticios_validos_e_explicados():
    exemplos = exemplos_para_interface()

    assert {item["id"] for item in exemplos} == {"pouca_espera", "acumulo_preparo", "desconto"}
    for exemplo in exemplos:
        assert "fictício" in exemplo["titulo"].lower()
        assert exemplo["o_que_explorar"]
        assert set(exemplo["parametros"]) == set(PADRAO)
        ParametrosSimulacao(**exemplo["parametros"])


def test_exemplo_de_pouca_espera_faz_o_que_anuncia():
    operacao = _executar_exemplo("pouca_espera")["operacao"]

    assert operacao["espera_media_fila_min"] == 0
    assert operacao["gargalos_observados"] == []


def test_exemplo_de_acumulo_no_preparo_faz_o_que_anuncia():
    operacao = _executar_exemplo("acumulo_preparo")["operacao"]

    assert operacao["gargalos_observados"] == ["preparo"]
    assert operacao["estacoes"]["preparo"]["fila_final"] > 0


def test_exemplo_de_desconto_mantem_o_volume_e_reduz_o_valor_por_pedido():
    base = executar_simulacao(ParametrosSimulacao(**PADRAO))
    com_desconto = _executar_exemplo("desconto")

    assert com_desconto["operacao"]["pedidos_recebidos"] == base["operacao"]["pedidos_recebidos"]
    assert com_desconto["operacao"]["pedidos_concluidos"] == base["operacao"]["pedidos_concluidos"]
    assert (
        com_desconto["financeiro"]["contribuicao_por_pedido_centavos"]
        < base["financeiro"]["contribuicao_por_pedido_centavos"]
    )


def test_fixture_dos_testes_de_javascript_continua_igual_ao_nucleo():
    fixture = json.loads(ARQUIVO_DA_FIXTURE.read_text(encoding="utf-8"))

    assert fixture == {
        nome: resultado_da_fixture(alteracoes) for nome, alteracoes in CENARIOS_DA_FIXTURE.items()
    }


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
