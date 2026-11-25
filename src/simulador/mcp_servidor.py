"""Ferramentas locais de consulta para clientes MCP via stdio."""

from typing import Annotated, Any

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations
from pydantic import Field

from .parametros import CAMPOS, ParametrosSimulacao
from .promocoes import ParametrosAlternativas, ParametrosPromocao, analisar_promocao
from .promocoes import comparar_alternativas as analisar_alternativas

servidor = FastMCP("Restaurant AI Insights")
_CONSULTA = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)
_INICIAL = {campo.nome: float(campo.padrao) for campo in CAMPOS}
_DESCRICAO_DESCONTO = (
    "Testa se um desconto por pedido se paga no cenário inicial do simulador "
    f"(preço R$ {_INICIAL['preco_venda']:.2f}, {int(_INICIAL['pedidos'])} pedidos recebidos, "
    f"{int(_INICIAL['pessoas_preparo'])} pessoas no preparo, turno de {int(_INICIAL['duracao_turno_min'])} min). "
    "Use para perguntas como 'um desconto de R$ 5 se paga?'. Devolve a meta de pedidos prontos, "
    "a capacidade do turno e a diferença no resultado, calculadas pelo motor. Valores em centavos."
)


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


@servidor.tool(title="Testar desconto", annotations=_CONSULTA, description=_DESCRICAO_DESCONTO)
def testar_desconto(
    desconto_reais: Annotated[float, Field(gt=0, description="Desconto por pedido, em reais.")],
    pedidos: Annotated[int | None, Field(ge=0, description="Pedidos recebidos no turno. Omita para usar o cenário inicial.")] = None,
) -> dict[str, Any]:
    base = ParametrosSimulacao.model_validate(_INICIAL)
    mudancas = {"desconto": desconto_reais} | ({"pedidos": pedidos} if pedidos is not None else {})
    promocional = ParametrosSimulacao.model_validate({**_INICIAL, **mudancas})
    resultado = analisar_promocao(ParametrosPromocao(base=base, promocional=promocional))
    equilibrio, promocao = resultado["equilibrio"], resultado["promocional"]
    return {
        "situacao": equilibrio["situacao"],
        "se_paga": equilibrio["atingiu_na_hipotese"],
        "pedidos_prontos_necessarios": equilibrio["pedidos_concluidos_minimos"],
        "capacidade_do_turno": equilibrio["maximo_concluidos_no_limite"],
        "pedidos_prontos_na_hipotese": promocao["pedidos_concluidos"],
        "pedidos_recebidos": promocao["pedidos_recebidos"],
        "diferenca_no_turno_centavos": resultado["diferencas"]["contribuicao_total_centavos"]["absoluta"],
        "desconto_maximo_centavos": equilibrio["desconto_maximo_centavos"],
        "explicacao": equilibrio["explicacao"],
    }


if __name__ == "__main__":
    servidor.run(transport="stdio")
