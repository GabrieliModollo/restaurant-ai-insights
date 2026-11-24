"""Compara custos comerciais de dois canais sob a mesma hipótese de promoção."""

from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from .financeiro import calcular_financeiro, calcular_taxa_centavos
from .promocoes import ParametrosPromocao
from .simulacao import executar_simulacao

Centavos = Annotated[int, Field(strict=True, ge=0, le=100_000_000)]
TaxaBps = Annotated[int, Field(strict=True, ge=0, le=10_000)]


class CustoCanal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    comissao_bps: TaxaBps
    pagamento_bps: TaxaBps
    frete_loja_centavos: Centavos
    desconto_loja_centavos: Centavos
    subsidio_plataforma_centavos: Centavos


class ParametrosCanais(ParametrosPromocao):
    canal_a: CustoCanal
    canal_b: CustoCanal

    @field_validator("canal_a", "canal_b")
    @classmethod
    def validar_divisao(cls, canal: CustoCanal, info: ValidationInfo) -> CustoCanal:
        promocao = info.data.get("promocional")
        if promocao and canal.desconto_loja_centavos + canal.subsidio_plataforma_centavos != promocao.desconto * 100:
            rotulo = info.field_name[-1].upper()
            raise ValueError(f"No canal {rotulo}, a parcela da loja e o subsídio devem somar o desconto da promoção.")
        return canal


def comparar_canais(parametros: ParametrosCanais) -> dict:
    promocao = parametros.promocional
    prontos = executar_simulacao(promocao)["operacao"]["pedidos_concluidos"]
    referencia = executar_simulacao(parametros.base)["financeiro"]["contribuicao_total_centavos"]

    def resumir(canal: CustoCanal) -> dict:
        financeiro = calcular_financeiro(
            preco_venda=promocao.preco_venda,
            desconto=Decimal(canal.desconto_loja_centavos).scaleb(-2),
            taxa_canal_pct=Decimal(canal.comissao_bps).scaleb(-2),
            custo_ingredientes=promocao.custo_ingredientes,
            custo_embalagem=promocao.custo_embalagem,
            pedidos_concluidos=prontos,
        )
        valor_loja = financeiro["preco_liquido_centavos"]
        pagamento = calcular_taxa_centavos(valor_loja, Decimal(canal.pagamento_bps).scaleb(-2))
        unitario = financeiro["contribuicao_por_pedido_centavos"] - pagamento - canal.frete_loja_centavos
        total = unitario * prontos
        return {
            **canal.model_dump(),
            "valor_loja_por_pedido_centavos": valor_loja,
            "comissao_por_pedido_centavos": financeiro["taxa_canal_centavos"],
            "pagamento_por_pedido_centavos": pagamento,
            "contribuicao_por_pedido_centavos": unitario,
            "contribuicao_total_centavos": total,
            "diferenca_referencia_centavos": total - referencia,
        }

    a, b = resumir(parametros.canal_a), resumir(parametros.canal_b)
    return {
        "canal_a": a,
        "canal_b": b,
        "preco_cliente_centavos": int((promocao.preco_venda - promocao.desconto) * 100),
        "pedidos_recebidos": promocao.pedidos,
        "pedidos_prontos": prontos,
        "duracao_turno_min": promocao.duracao_turno_min,
        "referencia_centavos": referencia,
        "turnos_diferentes": parametros.base.duracao_turno_min != promocao.duracao_turno_min,
        "diferenca_b_menos_a_centavos": b["contribuicao_total_centavos"] - a["contribuicao_total_centavos"],
    }
