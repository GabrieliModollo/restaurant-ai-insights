from decimal import Decimal
from fractions import Fraction
from itertools import groupby

import pytest

from src.simulador.operacao import simular_operacao


def _simular(**alteracoes):
    dados = {
        "pedidos": 10,
        "duracao_turno_min": 60,
        "pessoas_preparo": 1,
        "pessoas_embalagem": 1,
        "tempo_preparo_min": 1,
        "tempo_embalagem_min": 1,
    }
    return simular_operacao(**{**dados, **alteracoes})


def test_zero_pedidos():
    resultado = _simular(pedidos=0)

    assert resultado["pedidos_recebidos"] == 0
    assert resultado["pedidos_concluidos"] == 0
    assert resultado["pedidos_pendentes"] == 0
    assert resultado["espera_media_fila_min"] is None
    assert resultado["tempo_total_medio_min"] is None
    assert resultado["eventos"] == []
    assert resultado["gargalos_observados"] == []
    assert resultado["estacoes"]["preparo"]["diagnostico"] == "sem_fila"
    # A capacidade existe mesmo sem pedidos.
    assert resultado["estacoes"]["preparo"]["capacidade_teorica_turno"] == 60


def test_pedido_termina_exatamente_no_fim_do_turno_conta_como_concluido():
    resultado = _simular(pedidos=1, tempo_preparo_min=30, tempo_embalagem_min=30)

    assert resultado["pedidos_concluidos"] == 1
    assert resultado["pedidos_pendentes"] == 0
    assert resultado["tempo_total_medio_min"] == 60


def test_pedido_que_passa_do_fim_do_turno_fica_pendente():
    resultado = _simular(
        pedidos=1, tempo_preparo_min=30, tempo_embalagem_min=Decimal("30.01")
    )

    assert resultado["pedidos_concluidos"] == 0
    assert resultado["pendentes"]["em_embalagem"] == 1
    assert resultado["tempo_total_medio_min"] is None
    assert resultado["eventos"][-1]["tipo"] == "inicio_embalagem"


def test_fim_exato_com_intervalo_que_nao_tem_decimal_finito():
    # Chegadas a cada 10/3 min. O último pedido chega em 20/3 e termina em 10.
    resultado = _simular(
        pedidos=3,
        duracao_turno_min=10,
        tempo_preparo_min=Fraction(5, 3),
        tempo_embalagem_min=Fraction(5, 3),
    )

    assert resultado["pedidos_concluidos"] == 3


def test_capacidade_insuficiente_no_preparo_forma_fila_crescente():
    resultado = _simular(
        pedidos=60,
        tempo_preparo_min=2,
        pessoas_embalagem=5,
        tempo_embalagem_min=Decimal("0.5"),
    )
    preparo = resultado["estacoes"]["preparo"]

    assert preparo["capacidade_teorica_turno"] == 30
    assert resultado["pedidos_concluidos"] == 29
    assert resultado["pendentes"] == {
        "fila_preparo": 29,
        "em_preparo": 1,
        "fila_embalagem": 0,
        "em_embalagem": 1,
    }
    assert preparo["fila_maxima"] >= preparo["fila_final"] > 0
    assert preparo["diagnostico"] == "gargalo_observado"
    assert resultado["gargalos_observados"] == ["preparo"]


def test_capacidade_insuficiente_na_embalagem_e_o_gargalo_observado():
    resultado = _simular(
        pedidos=30,
        pessoas_preparo=2,
        tempo_preparo_min=1,
        tempo_embalagem_min=3,
    )

    assert resultado["pedidos_concluidos"] == 19
    assert resultado["pendentes"]["em_embalagem"] == 1
    assert resultado["pendentes"]["fila_embalagem"] == 10
    assert resultado["gargalos_observados"] == ["embalagem"]
    assert resultado["estacoes"]["preparo"]["diagnostico"] == "sem_fila"


def test_estacao_de_menor_capacidade_nao_e_automaticamente_gargalo():
    resultado = _simular(tempo_preparo_min=5, pessoas_embalagem=2, tempo_embalagem_min=2)

    assert resultado["estacoes_menor_capacidade"] == ["preparo"]
    assert resultado["gargalos_observados"] == []
    assert resultado["espera_media_fila_min"] == 0


def test_empate_de_capacidade_lista_as_duas_estacoes():
    resultado = _simular(tempo_preparo_min=2, tempo_embalagem_min=2)

    assert resultado["estacoes_menor_capacidade"] == ["preparo", "embalagem"]


def test_pedido_em_andamento_no_fim_nao_prova_sobrecarga():
    # O único pedido nem cabe no turno, mas não houve fila nenhuma.
    resultado = _simular(pedidos=1, tempo_preparo_min=100)

    assert resultado["pedidos_pendentes"] == 1
    assert resultado["pendentes"]["em_preparo"] == 1
    assert resultado["gargalos_observados"] == []


def test_fila_no_fim_do_turno_sem_sobrecarga_nao_e_gargalo():
    # O preparo entrega em lotes (minutos 10 e 11), criando fila passageira na embalagem,
    # que recebe 0,2 pedido/min e atende 0,33. No minuto 12 ainda há um pedido na fila.
    resultado = _simular(
        pedidos=12,
        duracao_turno_min=12,
        pessoas_preparo=2,
        tempo_preparo_min=10,
        tempo_embalagem_min=3,
    )
    embalagem = resultado["estacoes"]["embalagem"]

    assert embalagem["fila_final"] == 1
    assert embalagem["chegada_acima_do_ritmo"] is False
    assert embalagem["diagnostico"] == "fila_temporaria"
    assert resultado["gargalos_observados"] == ["preparo"]


def test_tempos_medios_somam_espera_das_duas_filas():
    # Chegadas a cada 2 min, preparo de 3 min e embalagem de 4 min, com uma pessoa em cada.
    # Pedido: espera no preparo + espera na embalagem = espera total | tempo total
    #   1º: 0 + 0 = 0 | 7
    #   2º: 1 + 1 = 2 | 9
    #   3º: 2 + 2 = 4 | 11
    #   4º: 3 + 3 = 6 | 13
    # O 5º terminaria no minuto 23, depois do turno, e fica fora das médias.
    resultado = _simular(
        pedidos=10,
        duracao_turno_min=20,
        tempo_preparo_min=3,
        tempo_embalagem_min=4,
    )

    assert resultado["pedidos_concluidos"] == 4
    assert resultado["espera_media_fila_min"] == 3
    assert resultado["tempo_total_medio_min"] == 10


def test_todo_pedido_recebido_esta_em_exatamente_um_estado():
    for pedidos in (0, 1, 7, 20, 26, 90, 300):
        resultado = _simular(
            pedidos=pedidos,
            pessoas_preparo=2,
            tempo_preparo_min=5,
            tempo_embalagem_min=2,
        )

        assert resultado["pedidos_recebidos"] == pedidos
        assert (
            resultado["pedidos_concluidos"] + sum(resultado["pendentes"].values()) == pedidos
        )


def test_eventos_seguem_o_tempo_e_o_turno_e_cada_pessoa_atende_um_por_vez():
    resultado = _simular(
        pedidos=40, pessoas_preparo=2, tempo_preparo_min=5, tempo_embalagem_min=2
    )
    eventos = resultado["eventos"]
    minutos = [evento["minuto"] for evento in eventos]

    assert minutos == sorted(minutos)
    assert minutos[-1] <= 60

    atendendo = {}
    for evento in eventos:
        posto = (evento["estacao"], evento["posto"])
        if evento["tipo"].startswith("inicio_"):
            assert posto not in atendendo
            atendendo[posto] = evento["pedido"]
        elif evento["tipo"].startswith("fim_"):
            assert atendendo.pop(posto) == evento["pedido"]

    fins = [evento for evento in eventos if evento["tipo"] == "fim_embalagem"]
    assert len(fins) == resultado["pedidos_concluidos"]


def test_duas_pessoas_atendem_em_paralelo_e_a_fila_respeita_a_ordem_de_chegada():
    # Chegadas nos minutos 0, 1, 2 e 3; preparo de 3 min. Cada posto só libera ao terminar:
    #   1º: posto 1, de 0 a 3  |  2º: posto 2, de 1 a 4
    #   3º: espera até 3, posto 1  |  4º: espera até 4, posto 2
    resultado = _simular(pedidos=4, duracao_turno_min=4, pessoas_preparo=2, tempo_preparo_min=3)

    inicios = [
        (evento["minuto"], evento["pedido"], evento["posto"])
        for evento in resultado["eventos"]
        if evento["tipo"] == "inicio_preparo"
    ]
    assert inicios == [(0, 1, 1), (1, 2, 2), (3, 3, 1), (4, 4, 2)]

    # Com uma só pessoa, no mesmo turno, só dois pedidos chegam a começar.
    com_uma_pessoa = _simular(pedidos=4, duracao_turno_min=4, tempo_preparo_min=3)
    assert com_uma_pessoa["estacoes"]["preparo"]["fila_final"] == 2


def _reproduzir(eventos):
    """Reconstrói os totais do fim do turno usando apenas a lista de eventos."""
    fila = {"preparo": 0, "embalagem": 0}
    atendendo = {"preparo": 0, "embalagem": 0}
    finalizados = {"preparo": 0, "embalagem": 0}
    fila_maxima = {"preparo": 0, "embalagem": 0}

    def registrar_maximos():
        for estacao, tamanho in fila.items():
            fila_maxima[estacao] = max(fila_maxima[estacao], tamanho)

    # O tamanho da fila é medido ao fim de cada instante, depois de todos os eventos dele.
    for _, do_instante in groupby(eventos, key=lambda evento: evento["minuto"]):
        for evento in do_instante:
            estacao = evento["estacao"]
            if evento["tipo"] == "chegada":
                fila["preparo"] += 1
            elif evento["tipo"].startswith("inicio_"):
                fila[estacao] -= 1
                atendendo[estacao] += 1
            else:
                atendendo[estacao] -= 1
                finalizados[estacao] += 1
                if estacao == "preparo":
                    fila["embalagem"] += 1
        registrar_maximos()

    return fila, atendendo, finalizados, fila_maxima


CENARIOS_DE_COERENCIA = {
    "padrao": {"pedidos": 20, "pessoas_preparo": 2, "tempo_preparo_min": 5, "tempo_embalagem_min": 2},
    "sem_pedidos": {"pedidos": 0},
    "gargalo_no_preparo": {"pedidos": 60, "tempo_preparo_min": 2, "pessoas_embalagem": 5},
    "gargalo_na_embalagem": {"pedidos": 30, "pessoas_preparo": 2, "tempo_embalagem_min": 3},
    "varias_pessoas": {
        "pedidos": 200,
        "pessoas_preparo": 7,
        "pessoas_embalagem": 3,
        "tempo_preparo_min": Decimal("2.5"),
        "tempo_embalagem_min": Decimal("0.7"),
    },
    "intervalo_sem_decimal_finito": {"pedidos": 7, "pessoas_preparo": 2, "tempo_preparo_min": 9},
    "fim_exato": {"pedidos": 1, "tempo_preparo_min": 30, "tempo_embalagem_min": 30},
    "nao_cabe_no_turno": {"pedidos": 3, "tempo_preparo_min": 100},
}


@pytest.mark.parametrize("cenario", CENARIOS_DE_COERENCIA.values(), ids=CENARIOS_DE_COERENCIA)
def test_eventos_reproduzem_os_totais_da_simulacao(cenario):
    resultado = _simular(**cenario)

    fila, atendendo, finalizados, fila_maxima = _reproduzir(resultado["eventos"])

    assert finalizados["embalagem"] == resultado["pedidos_concluidos"]
    assert resultado["pendentes"] == {
        "fila_preparo": fila["preparo"],
        "em_preparo": atendendo["preparo"],
        "fila_embalagem": fila["embalagem"],
        "em_embalagem": atendendo["embalagem"],
    }
    for nome, estacao in resultado["estacoes"].items():
        assert estacao["finalizados"] == finalizados[nome]
        assert estacao["fila_final"] == fila[nome]
        assert estacao["em_atendimento_final"] == atendendo[nome]
        assert estacao["fila_maxima"] == fila_maxima[nome]


@pytest.mark.parametrize("cenario", CENARIOS_DE_COERENCIA.values(), ids=CENARIOS_DE_COERENCIA)
def test_cada_pedido_segue_as_etapas_na_ordem_com_o_tempo_configurado(cenario):
    resultado = _simular(**cenario)
    etapas = ["chegada", "inicio_preparo", "fim_preparo", "inicio_embalagem", "fim_embalagem"]

    por_pedido = {}
    for evento in resultado["eventos"]:
        por_pedido.setdefault(evento["pedido"], {})[evento["tipo"]] = evento

    # Todo pedido recebido chega dentro do turno.
    assert sorted(por_pedido) == list(range(1, resultado["pedidos_recebidos"] + 1))

    for eventos_do_pedido in por_pedido.values():
        ocorridas = [etapa for etapa in etapas if etapa in eventos_do_pedido]
        # Nenhuma etapa é pulada, e o tempo nunca volta.
        assert ocorridas == etapas[: len(ocorridas)]
        minutos = [eventos_do_pedido[etapa]["minuto"] for etapa in ocorridas]
        assert minutos == sorted(minutos)

        for estacao, inicio, fim in (
            ("preparo", "inicio_preparo", "fim_preparo"),
            ("embalagem", "inicio_embalagem", "fim_embalagem"),
        ):
            if fim in eventos_do_pedido:
                tempo = eventos_do_pedido[fim]["minuto"] - eventos_do_pedido[inicio]["minuto"]
                configurado = resultado["estacoes"][estacao]["tempo_por_pedido_min"]
                assert tempo == pytest.approx(configurado)
                assert eventos_do_pedido[fim]["posto"] == eventos_do_pedido[inicio]["posto"]

    # Fila FIFO: em cada estação, os pedidos começam na ordem em que chegaram.
    for tipo in ("inicio_preparo", "inicio_embalagem"):
        pedidos = [evento["pedido"] for evento in resultado["eventos"] if evento["tipo"] == tipo]
        assert pedidos == sorted(pedidos)


@pytest.mark.parametrize("cenario", CENARIOS_DE_COERENCIA.values(), ids=CENARIOS_DE_COERENCIA)
def test_medias_informadas_coincidem_com_os_eventos(cenario):
    resultado = _simular(**cenario)

    por_pedido = {}
    for evento in resultado["eventos"]:
        por_pedido.setdefault(evento["pedido"], {})[evento["tipo"]] = evento["minuto"]
    concluidos = [etapas for etapas in por_pedido.values() if "fim_embalagem" in etapas]

    if not concluidos:
        assert resultado["espera_media_fila_min"] is None
        assert resultado["tempo_total_medio_min"] is None
        return

    esperas = [
        (e["inicio_preparo"] - e["chegada"]) + (e["inicio_embalagem"] - e["fim_preparo"])
        for e in concluidos
    ]
    totais = [e["fim_embalagem"] - e["chegada"] for e in concluidos]
    # As médias informadas têm 2 casas decimais.
    assert sum(esperas) / len(esperas) == pytest.approx(
        resultado["espera_media_fila_min"], abs=0.0051
    )
    assert sum(totais) / len(totais) == pytest.approx(
        resultado["tempo_total_medio_min"], abs=0.0051
    )


def test_mesmos_parametros_geram_o_mesmo_resultado():
    parametros = {"pedidos": 40, "pessoas_preparo": 2, "tempo_preparo_min": 5}

    assert _simular(**parametros) == _simular(**parametros)
