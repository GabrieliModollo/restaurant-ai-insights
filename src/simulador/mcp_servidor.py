"""Ferramentas locais de consulta para clientes MCP via stdio."""

from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

from .promocoes import ParametrosAlternativas, ParametrosPromocao, analisar_promocao
from .promocoes import comparar_alternativas as analisar_alternativas

servidor = FastMCP("Restaurant AI Insights")
_CONSULTA = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)


@servidor.tool(title="Simular promoção", annotations=_CONSULTA)
def simular_promocao(hipotese: ParametrosPromocao) -> dict[str, Any]:
    """Compara um turno de referência e uma hipótese promocional de um produto.

    Informe campos numéricos completos nos dois cenários. Dinheiro nas entradas
    em reais e nos resultados em centavos. O volume informado é uma hipótese.
    """
    return analisar_promocao(hipotese)


@servidor.tool(title="Comparar alternativas", annotations=_CONSULTA)
def comparar_alternativas(hipotese: ParametrosAlternativas) -> dict[str, Any]:
    """Compara desconto menor e reforço de uma pessoa, com o mesmo turno e volume.

    Informe desconto reduzido e custo de reforço em centavos inteiros. A estação
    pode ser pessoas_preparo ou pessoas_embalagem.
    """
    return analisar_alternativas(hipotese)


if __name__ == "__main__":
    servidor.run(transport="stdio")
