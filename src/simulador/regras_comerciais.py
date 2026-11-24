"""Recuperação local de guias oficiais e síntese com referências."""

import re
import unicodedata
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Campo = Literal["comissao_bps", "pagamento_bps", "frete_loja_centavos",
                "desconto_loja_centavos", "subsidio_plataforma_centavos"]

ROTULOS = {
    "comissao_bps": "comissão",
    "pagamento_bps": "taxa de pagamento",
    "frete_loja_centavos": "frete pago pela loja",
    "desconto_loja_centavos": "desconto pago pela loja",
    "subsidio_plataforma_centavos": "subsídio da plataforma",
}

# Paráfrases curtas mantidas junto à referência. A data é de consulta, não de vigência.
FONTES = (
    ("ifood-promocoes", "ifood", {"desconto"}, "iFood · Relatório de pedidos",
     "https://blog-parceiros.ifood.com.br/relatorio-de-pedidos/",
     "O relatório permite identificar o incentivo promocional custeado pelo iFood. Confira também o desconto atribuído à loja para separar as parcelas da oferta."),
    ("ifood-planos", "ifood", {"taxas", "frete"}, "iFood · Planos para restaurantes",
     "https://blog-parceiros.ifood.com.br/ifood-cadastro/",
     "As condições de comissão, pagamento e entrega variam conforme o plano. Use as cobranças aplicáveis à loja e ao pedido para preencher o cenário."),
    ("99food-promocoes", "99food", {"desconto"}, "99Food · Promoções e Taxas",
     "https://99app.com/99food/restaurantes/guias/promocoes-e-taxas-99food/",
     "O detalhamento distingue promoções bancadas pela loja de campanhas subsidiadas pela 99Food. O extrato ajuda a identificar o responsável pelo valor."),
    ("99food-cobrancas", "99food", {"taxas", "frete"}, "99Food · Entendendo as cobranças",
     "https://99app.com/99food/restaurantes/guias/entendendo-as-cobrancas-da-99food/",
     "As cobranças incluem comissão, processamento do pagamento e, conforme a modalidade, custos logísticos. Algumas cobranças variam conforme a oferta comercial aplicada à loja."),
)


class ConsultaComercial(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pergunta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=300)]
    confirmados: Annotated[set[Campo], Field(max_length=5)] = Field(default_factory=set)


def _normalizar(texto: str) -> str:
    decomposicao = unicodedata.normalize("NFD", texto.casefold())
    return "".join(letra for letra in decomposicao if not unicodedata.combining(letra))


def consultar_regras(consulta: ConsultaComercial) -> dict:
    pergunta = _normalizar(consulta.pergunta)
    plataformas = set()
    if re.search(r"\bi\s*food\b", pergunta):
        plataformas.add("ifood")
    if re.search(r"\b99(?:\s*food)?\b", pergunta):
        plataformas.add("99food")

    termos = set(re.findall(r"[a-z]+", pergunta))
    temas = set()
    campos = set()
    if termos & {"desconto", "descontos", "cupom", "cupons", "subsidio", "subsidios",
                 "incentivo", "banca", "bancado", "custea", "custeia", "promocao", "promocoes"}:
        temas.add("desconto")
        campos.update(("desconto_loja_centavos", "subsidio_plataforma_centavos"))
    if termos & {"comissao", "comissoes", "taxa", "taxas", "pagamento", "cartao", "pix", "tarifa"}:
        temas.add("taxas")
        campos.update(("comissao_bps", "pagamento_bps"))
    if termos & {"frete", "fretes", "entrega", "entregas", "logistica"}:
        temas.add("frete")
        campos.add("frete_loja_centavos")
    if termos & {"contribuicao", "margem", "sobra", "contribuicoes"} or (not temas and "comparar" in termos):
        temas.update(("desconto", "taxas", "frete"))
        campos.update(ROTULOS)

    fora_do_escopo = termos & {"rappi", "keeta", "aiqfome", "ubereats"}
    fontes = [
        {"id": codigo, "titulo": titulo, "url": url, "consultado_em": "2026-11-24", "resumo": resumo}
        for codigo, plataforma, assuntos, titulo, url, resumo in FONTES
        if (plataforma in plataformas or not plataformas and not fora_do_escopo) and temas & assuntos
    ]
    if not fontes:
        return {
            "situacao": "sem_fonte",
            "orientacao": "Não encontrei uma fonte para essa pergunta na base local. Pergunte sobre desconto, comissão, pagamento ou frete.",
            "fontes": [],
            "dados_faltantes": [],
        }
    faltantes = [rotulo for campo, rotulo in ROTULOS.items() if campo in campos - consulta.confirmados]
    respostas = {
        "desconto": "O valor que o cliente economiza pode ser dividido entre a loja e a plataforma.",
        "taxas": "Comissão e taxa de pagamento alteram quanto sobra em cada pedido.",
        "frete": "O custo logístico pode mudar conforme quem entrega e quem paga o frete.",
    }
    aviso = "Os guias explicam os tipos de cobrança. Os valores e a base de cálculo da sua loja dependem do contrato ou do extrato da promoção."
    if fora_do_escopo:
        aviso += " A consulta cobre apenas as fontes encontradas para iFood ou 99Food."
    return {
        "situacao": "com_fontes",
        "resposta": " ".join(texto for tema, texto in respostas.items() if tema in temas),
        "orientacao": aviso,
        "fontes": fontes,
        "dados_faltantes": faltantes,
    }
