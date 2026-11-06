"""Compara contribuições e resolve n × margem promocional >= total da base.

Centavos inteiros e Fraction nas decisões; float apenas nos percentuais de saída.
Não estima demanda nem confunde equilíbrio da contribuição com lucro do negócio.
"""

from fractions import Fraction

from pydantic import BaseModel, ConfigDict

from .parametros import CAMPOS, ParametrosSimulacao
from .simulacao import executar_simulacao


class ParametrosPromocao(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    base: ParametrosSimulacao
    promocional: ParametrosSimulacao


def variacao_percentual(base: int, atual: int) -> float | None:
    """Usa |base| para manter o sentido de aumento/redução quando a base é negativa."""
    return float(Fraction((atual - base) * 100, abs(base))) if base else None


def calcular_equilibrio(total_base: int, margem_promocional: int, concluidos_base: int) -> dict:
    """Resolve a desigualdade para inteiros n >= 0, sem presumir margem positiva.

    Com base negativa, zero pedidos já supera a base: não significa operação saudável.
    Margem negativa impõe um máximo, e não uma meta a perseguir vendendo mais.
    """
    if total_base <= 0:
        minimo = 0
        maximo = total_base // margem_promocional if margem_promocional < 0 else None
    elif margem_promocional <= 0:
        minimo = maximo = None
    else:
        minimo = (total_base + margem_promocional - 1) // margem_promocional
        maximo = None
    return {
        "pedidos_concluidos_minimos": minimo,
        "pedidos_concluidos_maximos": maximo,
        "adicionais_sobre_base": max(0, minimo - concluidos_base) if minimo is not None else None,
    }


def _resumir(parametros: ParametrosSimulacao, resultado: dict) -> dict:
    # Dinheiro já validado tem no máximo duas casas decimais.
    original = int(parametros.preco_venda * 100)
    desconto = int(parametros.desconto * 100)
    return {
        "preco_original_centavos": original,
        "desconto_centavos": desconto,
        "desconto_pct": float(Fraction(desconto * 100, original)),
        "taxa_canal_pct": float(parametros.taxa_canal_pct),
        "custo_ingredientes_centavos": int(parametros.custo_ingredientes * 100),
        "custo_embalagem_centavos": int(parametros.custo_embalagem * 100),
        **resultado["financeiro"],
        "pedidos_recebidos": resultado["operacao"]["pedidos_recebidos"],
        "pedidos_concluidos": resultado["operacao"]["pedidos_concluidos"],
        "pedidos_pendentes": resultado["operacao"]["pedidos_pendentes"],
        "duracao_turno_min": parametros.duracao_turno_min,
    }


def analisar_promocao(parametros: ParametrosPromocao) -> dict:
    base = _resumir(parametros.base, executar_simulacao(parametros.base))
    promocional = _resumir(parametros.promocional, executar_simulacao(parametros.promocional))
    total_base = base["contribuicao_total_centavos"]
    margem = promocional["contribuicao_por_pedido_centavos"]
    equilibrio = calcular_equilibrio(total_base, margem, base["pedidos_concluidos"])
    limite = int(next(campo.maximo for campo in CAMPOS if campo.nome == "pedidos"))
    # Com chegadas uniformes, aumentar N antecipa a chegada de cada k-ésimo pedido.
    # FIFO, tempos constantes e servidores fixos preservam essa ordem nos dois estágios.
    # Logo, N máximo dá o máximo de conclusões permitido por estas hipóteses e limites.
    parametros_limite = parametros.promocional.model_copy(update={"pedidos": limite})
    operacao_limite = executar_simulacao(parametros_limite)["operacao"]
    maximo_operacional = operacao_limite["pedidos_concluidos"]
    minimo = equilibrio["pedidos_concluidos_minimos"]
    atingiu = promocional["contribuicao_total_centavos"] >= total_base
    if minimo is None:
        situacao = "impossivel_financeiramente"
    elif minimo > limite:
        situacao = "fora_dos_limites"
    elif minimo > maximo_operacional:
        situacao = "capacidade_insuficiente"
    elif margem < 0 and not atingiu:
        situacao = "limite_de_perda_excedido"
    elif atingiu:
        situacao = "meta_atingida"
    else:
        situacao = "volume_insuficiente"

    diferencas = {}
    for chave in base:
        anterior, atual = base[chave], promocional[chave]
        # Os percentuais dos campos são dados descritivos; diferenças percentuais
        # são calculadas apenas para inteiros (centavos, pedidos e duração).
        if isinstance(anterior, int):
            diferencas[chave] = {
                "absoluta": atual - anterior,
                "percentual": variacao_percentual(anterior, atual),
            }
    alertas = []
    if margem < 0:
        alertas.append("Cada pedido promocional concluído tem contribuição negativa. Vender mais amplia a perda de contribuição.")
    elif margem == 0:
        alertas.append("A contribuição promocional por pedido é zero. Mais pedidos não aumentam a contribuição total.")
    if total_base < 0:
        alertas.append("A base tem contribuição total negativa. Zero pedidos já supera essa base; isso não representa equilíbrio do negócio nem recomenda fechar a operação.")
    if promocional["pedidos_pendentes"]:
        alertas.append("Parte dos pedidos recebidos não termina no turno e não entra na contribuição total. Recebidos não são concluídos.")
    if base["duracao_turno_min"] != promocional["duracao_turno_min"]:
        alertas.append("Os turnos têm durações diferentes. Os totais cobrem períodos diferentes.")
    outros = [campo.rotulo for campo in CAMPOS if campo.nome not in {"desconto", "pedidos"}
              and getattr(parametros.base, campo.nome) != getattr(parametros.promocional, campo.nome)]
    if outros:
        alertas.append("Também mudaram: " + ", ".join(outros) + ". As diferenças não decorrem apenas do desconto.")
    explicacoes = {
        "impossivel_financeiramente": "A margem promocional não é positiva: nenhum volume pode alcançar a contribuição positiva da base.",
        "fora_dos_limites": "A quantidade mínima de conclusões supera o limite de pedidos recebidos permitido na simulação.",
        "capacidade_insuficiente": "Mesmo no limite de pedidos recebidos, a equipe e os tempos informados não concluem a quantidade mínima neste turno.",
        "meta_atingida": "Nas hipóteses informadas, a contribuição promocional iguala ou supera a contribuição total da base.",
        "volume_insuficiente": "A hipótese atual ainda não compensa a base. A meta cabe no modelo operacional, mas não há previsão de demanda nem garantia de alcançá-la.",
        "limite_de_perda_excedido": "A contribuição negativa acumulada ficou abaixo da base. Aumentar pedidos piora o resultado; observe o máximo admissível, não uma meta de crescimento.",
    }
    return {
        "base": base,
        "promocional": promocional,
        "diferencas": diferencas,
        "equilibrio": {
            **equilibrio,
            "situacao": situacao,
            "atingiu_na_hipotese": atingiu,
            "limite_pedidos_recebidos": limite,
            "maximo_concluidos_no_limite": maximo_operacional,
            "adicionais_na_hipotese": max(0, minimo - promocional["pedidos_concluidos"]) if minimo is not None else None,
            "explicacao": explicacoes[situacao],
        },
        "alertas": alertas,
        "identificacao": "Análise determinística das hipóteses informadas. Sem IA conectada e sem previsão de vendas. Contribuição não é lucro líquido.",
        "formulas": [
            "Preço líquido = preço original − desconto. Desconto (%) = desconto ÷ preço original × 100.",
            "Taxa do canal = preço líquido × taxa (%), arredondada por pedido ao centavo, com meio centavo para cima.",
            "Contribuição unitária = preço líquido − taxa do canal − ingredientes − embalagem.",
            "Contribuição total = contribuição unitária × pedidos concluídos, não pedidos recebidos.",
            "Com base positiva e margem promocional positiva: mínimo = teto(total da base ÷ margem promocional). Adicionais sobre a base = máximo(0, mínimo − conclusões da base).",
            "Se a meta da base é zero ou negativa, o mínimo é zero. Com margem promocional negativa, o máximo admissível é piso(total da base ÷ margem promocional); mais conclusões podem piorar o resultado.",
            "Diferença absoluta = promoção − base. Variação (%) = diferença ÷ |base| × 100; indefinida quando a base é zero. Percentuais são arredondados apenas na exibição.",
            "O máximo operacional usa o limite de pedidos recebidos, mantendo equipe, tempos, turno e chegadas uniformes. É um teto do modelo, não uma previsão de vendas nem a quantidade de pedidos a captar.",
        ],
    }
