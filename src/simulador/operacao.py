"""Simulação determinística de filas: chegada → preparo → embalagem.

Os tempos usam Fraction (fração exata), não float. Assim, um pedido que termina
exatamente no fim do turno é contado como concluído, sem erro de arredondamento.

Regras do modelo:
- Os pedidos chegam em intervalos iguais: minuto 0, T/N, 2T/N... (T = turno, N = pedidos).
- Cada estação tem fila única em ordem de chegada; cada pessoa atende um pedido por vez.
- Todos têm o mesmo tempo de atendimento, portanto a ordem dos pedidos nunca se inverte.
- No instante exato do fim do turno, quem começou a ser atendido conta como em atendimento.

Diagnóstico de cada estação:
- "sem_fila": nenhum pedido precisou esperar nela.
- "fila_temporaria": houve fila, mas sem evidência de sobrecarga.
- "gargalo_observado": os pedidos chegam à estação mais rápido do que ela atende
  E ainda há fila no fim do turno. Pedido em atendimento não basta, nem fila sozinha.
"""

import heapq
import math
from decimal import ROUND_HALF_UP, Decimal
from fractions import Fraction

PREPARO = "preparo"
EMBALAGEM = "embalagem"

# Em um mesmo instante, a pessoa termina um pedido antes de começar o próximo.
_ORDEM_NO_MESMO_INSTANTE = {
    "fim_embalagem": 0,
    "fim_preparo": 1,
    "chegada": 2,
    "inicio_preparo": 3,
    "inicio_embalagem": 4,
}


def _minutos(valor: Fraction | None) -> float | None:
    """Arredonda para exibição (2 casas, meio para cima). Só é usado na saída."""
    if valor is None:
        return None
    decimal = Decimal(valor.numerator) / Decimal(valor.denominator)
    return float(decimal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _media(valores: list[Fraction]) -> Fraction | None:
    return sum(valores, Fraction(0)) / len(valores) if valores else None


def _atender(entradas: list[Fraction], pessoas: int, tempo: Fraction) -> list[tuple]:
    """Atende na ordem de entrada e devolve (início, fim, posto) de cada pedido."""
    livres = [(Fraction(0), posto) for posto in range(1, pessoas + 1)]
    atendimentos = []
    for entrada in entradas:
        livre_em, posto = heapq.heappop(livres)
        inicio = max(entrada, livre_em)
        fim = inicio + tempo
        heapq.heappush(livres, (fim, posto))
        atendimentos.append((inicio, fim, posto))
    return atendimentos


def _fila_maxima(entradas: list[Fraction], atendimentos: list[tuple], turno: Fraction) -> int:
    variacoes = []
    for entrada, (inicio, _, _) in zip(entradas, atendimentos):
        if inicio > entrada and entrada <= turno:
            variacoes.append((entrada, 1))
            if inicio <= turno:
                variacoes.append((inicio, -1))

    tamanho = maximo = 0
    # No mesmo instante, a saída da fila (-1) é ordenada antes da entrada (+1).
    for _, variacao in sorted(variacoes):
        tamanho += variacao
        maximo = max(maximo, tamanho)
    return maximo


def _resumir_estacao(
    entradas: list[Fraction],
    atendimentos: list[tuple],
    pessoas: int,
    tempo: Fraction,
    turno: Fraction,
    fluxo_de_entrada: Fraction,
) -> dict:
    fila_final = sum(
        entrada <= turno < inicio for entrada, (inicio, _, _) in zip(entradas, atendimentos)
    )
    fila_maxima = _fila_maxima(entradas, atendimentos, turno)
    ritmo = pessoas / tempo  # pedidos por minuto
    sobrecarga = fluxo_de_entrada > ritmo

    if fila_maxima == 0:
        diagnostico = "sem_fila"
    elif sobrecarga and fila_final > 0:
        diagnostico = "gargalo_observado"
    else:
        diagnostico = "fila_temporaria"

    return {
        "pessoas": pessoas,
        "tempo_por_pedido_min": _minutos(tempo),
        "capacidade_teorica_turno": math.floor(ritmo * turno),
        "capacidade_teorica_hora": _minutos(ritmo * 60),
        "finalizados": sum(fim <= turno for _, fim, _ in atendimentos),
        "fila_final": fila_final,
        "em_atendimento_final": sum(inicio <= turno < fim for inicio, fim, _ in atendimentos),
        "fila_maxima": fila_maxima,
        "chegada_acima_do_ritmo": sobrecarga,
        "diagnostico": diagnostico,
    }


def _criar_eventos(chegadas, preparos, embalagens, turno: Fraction) -> list[dict]:
    brutos = []
    for numero, (chegada, preparo, embalagem) in enumerate(
        zip(chegadas, preparos, embalagens), start=1
    ):
        brutos.append((chegada, "chegada", numero, None, None))
        for prefixo, estacao, (inicio, fim, posto) in (
            ("preparo", PREPARO, preparo),
            ("embalagem", EMBALAGEM, embalagem),
        ):
            brutos.append((inicio, f"inicio_{prefixo}", numero, estacao, posto))
            brutos.append((fim, f"fim_{prefixo}", numero, estacao, posto))

    visiveis = [evento for evento in brutos if evento[0] <= turno]
    visiveis.sort(key=lambda e: (e[0], _ORDEM_NO_MESMO_INSTANTE[e[1]], e[2]))
    return [
        {"minuto": float(minuto), "tipo": tipo, "pedido": pedido, "estacao": estacao, "posto": posto}
        for minuto, tipo, pedido, estacao, posto in visiveis
    ]


def simular_operacao(
    *,
    pedidos: int,
    duracao_turno_min,
    pessoas_preparo: int,
    pessoas_embalagem: int,
    tempo_preparo_min,
    tempo_embalagem_min,
) -> dict:
    turno = Fraction(duracao_turno_min)
    tempo_preparo = Fraction(tempo_preparo_min)
    tempo_embalagem = Fraction(tempo_embalagem_min)

    chegadas = [indice * turno / pedidos for indice in range(pedidos)]
    preparos = _atender(chegadas, pessoas_preparo, tempo_preparo)
    entradas_embalagem = [fim for _, fim, _ in preparos]
    embalagens = _atender(entradas_embalagem, pessoas_embalagem, tempo_embalagem)

    # A embalagem só recebe o que o preparo consegue entregar.
    fluxo_preparo = Fraction(pedidos) / turno
    fluxo_embalagem = min(fluxo_preparo, pessoas_preparo / tempo_preparo)
    estacoes = {
        PREPARO: _resumir_estacao(
            chegadas, preparos, pessoas_preparo, tempo_preparo, turno, fluxo_preparo
        ),
        EMBALAGEM: _resumir_estacao(
            entradas_embalagem,
            embalagens,
            pessoas_embalagem,
            tempo_embalagem,
            turno,
            fluxo_embalagem,
        ),
    }

    esperas = []
    tempos_totais = []
    for chegada, preparo, embalagem in zip(chegadas, preparos, embalagens):
        if embalagem[1] <= turno:
            esperas.append((preparo[0] - chegada) + (embalagem[0] - preparo[1]))
            tempos_totais.append(embalagem[1] - chegada)
    concluidos = len(tempos_totais)

    ritmos = {
        PREPARO: pessoas_preparo / tempo_preparo,
        EMBALAGEM: pessoas_embalagem / tempo_embalagem,
    }
    menor_ritmo = min(ritmos.values())

    return {
        "duracao_turno_min": float(turno),
        "pedidos_recebidos": pedidos,
        "pedidos_concluidos": concluidos,
        "pedidos_pendentes": pedidos - concluidos,
        "pendentes": {
            "fila_preparo": estacoes[PREPARO]["fila_final"],
            "em_preparo": estacoes[PREPARO]["em_atendimento_final"],
            "fila_embalagem": estacoes[EMBALAGEM]["fila_final"],
            "em_embalagem": estacoes[EMBALAGEM]["em_atendimento_final"],
        },
        "espera_media_fila_min": _minutos(_media(esperas)),
        "tempo_total_medio_min": _minutos(_media(tempos_totais)),
        "estacoes": estacoes,
        "estacoes_menor_capacidade": [
            nome for nome, ritmo in ritmos.items() if ritmo == menor_ritmo
        ],
        "gargalos_observados": [
            nome
            for nome, estacao in estacoes.items()
            if estacao["diagnostico"] == "gargalo_observado"
        ],
        "eventos": _criar_eventos(chegadas, preparos, embalagens, turno),
    }
