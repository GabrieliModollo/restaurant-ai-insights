"""Resumo do turno completo em linguagem simples, gerado por regras fixas.

Cada frase é sustentada pelos resultados do núcleo. O resumo não atribui causas externas,
não promete melhorias nem declara um cenário melhor que outro.
"""

IDENTIFICACAO = "Análise gerada por regras, sem IA conectada. Considera o turno completo."
CUSTOS_EXCLUIDOS = "Impostos, salários, aluguel e desperdício ainda não foram descontados."
VALOR_QUE_SOBRA = "valor que sobra após os custos por pedido (margem de contribuição)"
NOMES_COM_ARTIGO = {"preparo": "no preparo", "embalagem": "na embalagem"}


def _reais(centavos: int) -> str:
    inteiro, resto = divmod(abs(centavos), 100)
    texto = f"R$ {inteiro:,}".replace(",", ".") + f",{resto:02d}"
    return f"−{texto}" if centavos < 0 else texto


def _juntar(nomes: list[str]) -> str:
    return " e ".join(nomes)


def _conclusao(operacao: dict) -> str:
    recebidos = operacao["pedidos_recebidos"]
    concluidos = operacao["pedidos_concluidos"]
    if recebidos == 0:
        return "Nenhum pedido foi informado para este turno."
    if concluidos == 0:
        if recebidos == 1:
            return "O único pedido não ficou pronto até o fim do turno."
        return f"Nenhum dos {recebidos} pedidos ficou pronto até o fim do turno."
    verbo = "ficou pronto" if concluidos == 1 else "ficaram prontos"
    return f"{concluidos} de {recebidos} pedidos {verbo} até o fim do turno."


def _pendentes(operacao: dict) -> str:
    total = operacao["pedidos_pendentes"]
    if total == 0:
        return "Nenhum pedido ficou em fila ou em processamento ao final."
    pendentes = operacao["pendentes"]
    em_fila = pendentes["fila_preparo"] + pendentes["fila_embalagem"]
    em_processamento = pendentes["em_preparo"] + pendentes["em_embalagem"]
    inicio = (
        "1 pedido continuava pendente" if total == 1 else f"{total} pedidos continuavam pendentes"
    )
    return f"{inicio} ao final: {em_fila} em fila e {em_processamento} em processamento."


def _valor(financeiro: dict, operacao: dict) -> str:
    total = financeiro["contribuicao_total_centavos"]
    capitalizado = VALOR_QUE_SOBRA.capitalize()
    if total < 0:
        frase = f"O {VALOR_QUE_SOBRA} está negativo: {_reais(total)}."
    elif total > 0:
        frase = f"{capitalizado}: {_reais(total)}."
    elif operacao["pedidos_concluidos"] == 0:
        frase = f"Sem pedidos concluídos, o {VALOR_QUE_SOBRA} é {_reais(0)}."
    else:
        frase = f"{capitalizado}: {_reais(0)}. A receita de cada pedido cobre exatamente esses custos."
    return f"{frase} {CUSTOS_EXCLUIDOS}"


def _atencao(financeiro: dict, operacao: dict) -> str | None:
    por_pedido = financeiro["contribuicao_por_pedido_centavos"]
    if por_pedido < 0:
        return f"Cada pedido concluído reduz o valor que sobra em {_reais(abs(por_pedido))}."

    gargalos = operacao["gargalos_observados"]
    if gargalos:
        return (
            f"Onde os pedidos estão acumulando: {_juntar(gargalos)}. "
            "Os pedidos chegam mais rápido do que a estação atende, e sobrou fila no fim do turno."
        )

    com_fila = [
        NOMES_COM_ARTIGO[nome]
        for nome, estacao in operacao["estacoes"].items()
        if estacao["diagnostico"] == "fila_temporaria"
    ]
    if com_fila:
        estacoes = "nestas estações" if len(com_fila) > 1 else "nesta estação"
        return f"Houve fila {_juntar(com_fila)}, mas os dados não comprovam sobrecarga {estacoes}."
    return None


def criar_resumo(financeiro: dict, operacao: dict) -> dict:
    return {
        "identificacao": IDENTIFICACAO,
        "conclusao": _conclusao(operacao),
        "pendentes": _pendentes(operacao),
        "valor": _valor(financeiro, operacao),
        "atencao": _atencao(financeiro, operacao),
    }
