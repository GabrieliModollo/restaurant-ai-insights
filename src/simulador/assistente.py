"""Assistente de decisões: a IA interpreta a pergunta, o motor calcula e o Python escreve a resposta.

Fluxo: pergunta → interpretação em JSON (Ollama opcional; regras como reserva) → validação →
ferramenta do motor → resposta composta só com números calculados pelo servidor.
O modelo nunca escreve a resposta nem inventa valores: todo número que ele devolve
precisa estar escrito na pergunta, ou a interpretação por regras assume.
"""

import json
import re
import unicodedata
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from . import explicacao
from .explicacao import MODELO, OllamaIndisponivel, habilitada
from .parametros import CAMPOS, ParametrosSimulacao
from .promocoes import ParametrosPromocao, analisar_promocao
from .regras_comerciais import ConsultaComercial, consultar_regras
from .simulacao import executar_simulacao

VERSAO_PROMPT = "assistente-v2"
_ROTULOS = {campo.nome: campo.rotulo for campo in CAMPOS}
EXEMPLOS = (
    "Um desconto de R$ 5 se paga?",
    "E se eu colocar mais uma pessoa no preparo?",
    "Quantos pedidos ficam prontos se chegarem 30?",
    "Quem paga o desconto no iFood?",
)


class PerguntaAssistente(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pergunta: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=300)]
    cenario: ParametrosSimulacao


class Interpretacao(BaseModel):
    """O que a pergunta pede. É o único formato que o modelo pode devolver."""

    model_config = ConfigDict(extra="forbid")

    intencao: Literal["promocao", "equipe", "pedidos", "regras", "fora_do_escopo"]
    # Só o sinal é conferido aqui. Os limites ficam em ParametrosSimulacao, que explica o erro.
    desconto_reais: Annotated[float, Field(gt=0)] | None = None
    desconto_pct: Annotated[float, Field(gt=0)] | None = None
    pedidos: Annotated[int, Field(ge=0)] | None = None
    estacao: Literal["preparo", "embalagem"] | None = None
    pessoas_a_mais: Annotated[int, Field(ge=1)] | None = None


# ---------------------------------------------------------------- interpretação por regras

_POR_EXTENSO = {"um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "quatro": 4, "cinco": 5,
                "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10}
_NUMERO = r"(\d+(?:[.,]\d{1,2})?)"
_DINHEIRO = re.compile(rf"r\$\s*{_NUMERO}|{_NUMERO}\s*(?:reais|real)\b")
_PERCENTUAL = re.compile(rf"{_NUMERO}\s*(?:%|por\s*cento)")
_PEDIDOS = re.compile(r"(\d+)\s*pedidos?\b|(?:chegarem|chegar|receber|vierem|entrarem)\s+(\d+)\b")
_PESSOAS = re.compile(r"\b(\d+|" + "|".join(_POR_EXTENSO) + r")\s+(?:pessoas?|funcionari\w*|cozinheir\w*|ajudantes?|embaladore?s?)\b")
_TERMOS_DESCONTO = re.compile(r"\b(?:descont\w*|promo\w*|cupo\w*|oferta|baixar|abaixar|diminuir|reduzir|tirar)\b")
_TERMOS_EQUIPE = re.compile(r"\b(?:pessoas?|funcionari\w*|equipe|reforc\w*|cozinheir\w*|ajudantes?|embaladore?s?|embalando|alguem)\b")
_TERMOS_ACRESCIMO = re.compile(r"\b(?:mais|outra|outro|contrat\w*|reforc\w*|colocar|adicionar|extra)\b")
_TERMOS_REGRAS = re.compile(r"\b(?:comiss\w*|i\s*food|99\s*food|frete|subsidi\w*|plataforma|aplicativo)\b")


def _normalizar(texto: str) -> str:
    decomposicao = unicodedata.normalize("NFD", texto.casefold())
    return "".join(letra for letra in decomposicao if not unicodedata.combining(letra))


def _decimal(texto: str) -> Decimal:
    return Decimal(texto.replace(",", "."))


def numeros_da_pergunta(pergunta: str) -> set[Decimal]:
    """Números escritos na pergunta, com algarismos ou por extenso até dez."""
    texto = _normalizar(pergunta)
    numeros = {_decimal(numero) for numero in re.findall(_NUMERO, texto)}
    numeros.update(Decimal(valor) for palavra, valor in _POR_EXTENSO.items()
                   if re.search(rf"\b{palavra}\b", texto))
    return numeros


def interpretar_por_regras(pergunta: str) -> Interpretacao:
    texto = _normalizar(pergunta)
    dinheiro = _DINHEIRO.search(texto)
    percentual = _PERCENTUAL.search(texto)
    pedidos = _PEDIDOS.search(texto)
    pessoas = _PESSOAS.search(texto)
    quer_desconto = bool(_TERMOS_DESCONTO.search(texto))
    fala_de_equipe = bool(_TERMOS_EQUIPE.search(texto))
    acrescenta_equipe = fala_de_equipe and bool(_TERMOS_ACRESCIMO.search(texto) or pessoas)

    valores = {}
    if pedidos:
        valores["pedidos"] = int(pedidos.group(1) or pedidos.group(2))
    if acrescenta_equipe:
        valores["estacao"] = "embalagem" if "embal" in texto else "preparo"
        quantidade = pessoas.group(1) if pessoas else "1"
        valores["pessoas_a_mais"] = _POR_EXTENSO.get(quantidade) or int(quantidade) or 1

    # Desconto zero não é uma hipótese a testar: a pergunta segue como "qual desconto?".
    if dinheiro and _decimal(dinheiro.group(1) or dinheiro.group(2)) > 0:
        valores["desconto_reais"] = float(_decimal(dinheiro.group(1) or dinheiro.group(2)))
    elif percentual and _decimal(percentual.group(1)) > 0:
        valores["desconto_pct"] = float(_decimal(percentual.group(1)))
    tem_valor = "desconto_reais" in valores or "desconto_pct" in valores
    if quer_desconto and tem_valor:
        return Interpretacao(intencao="promocao", **valores)
    valores.pop("desconto_reais", None)
    valores.pop("desconto_pct", None)
    if _TERMOS_REGRAS.search(texto):
        return Interpretacao(intencao="regras")
    if quer_desconto:
        return Interpretacao(intencao="promocao", **valores)
    if acrescenta_equipe:
        return Interpretacao(intencao="equipe", **valores)
    # "A equipe dá conta de 30 pedidos?" pergunta sobre volume, não sobre contratar.
    if pedidos:
        return Interpretacao(intencao="pedidos", **valores)
    if fala_de_equipe:
        return Interpretacao(intencao="equipe", estacao="preparo", pessoas_a_mais=1)
    return Interpretacao(intencao="fora_do_escopo")


# ---------------------------------------------------------------- interpretação por IA local

_INSTRUCAO = (
    "Você transforma perguntas de gerentes de restaurante em JSON para um simulador. "
    "Não calcule nem responda a pergunta. Copie apenas números escritos na pergunta e use null "
    "para o que não foi dito. intencao: promocao (testar um desconto em reais ou em %), equipe "
    "(mais pessoas no preparo ou na embalagem; cozinha e cozinheiro são preparo), pedidos (outra "
    "quantidade de pedidos recebidos, sem desconto), regras (comissão, taxas, frete ou subsídio do "
    "iFood ou da 99Food) ou fora_do_escopo (qualquer outro assunto). Em equipe, sempre informe estacao."
)
_VAZIO = {"desconto_reais": None, "desconto_pct": None, "pedidos": None, "estacao": None, "pessoas_a_mais": None}
_EXEMPLOS_MODELO = (
    ("Vale a pena dar 10% de desconto com 25 pedidos?",
     {**_VAZIO, "intencao": "promocao", "desconto_pct": 10, "pedidos": 25}),
    ("Se eu puser mais duas pessoas na embalagem melhora?",
     {**_VAZIO, "intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 2}),
    ("Mais um cozinheiro ajuda?", {**_VAZIO, "intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1}),
    ("E se chegarem 45 pedidos?", {**_VAZIO, "intencao": "pedidos", "pedidos": 45}),
    ("Quanto o iFood cobra de comissão?", {**_VAZIO, "intencao": "regras"}),
    ("Qual o melhor sabor de pizza?", {**_VAZIO, "intencao": "fora_do_escopo"}),
)


def consultar_modelo(pergunta: str) -> str:
    mensagens = [{"role": "system", "content": _INSTRUCAO}]
    for exemplo, resposta in _EXEMPLOS_MODELO:
        mensagens.append({"role": "user", "content": exemplo})
        mensagens.append({"role": "assistant", "content": json.dumps(resposta)})
    mensagens.append({"role": "user", "content": pergunta})
    return explicacao.chamar_ollama(mensagens, Interpretacao.model_json_schema())


def _numeros_usados(interpretacao: Interpretacao) -> set[Decimal]:
    valores = (interpretacao.desconto_reais, interpretacao.desconto_pct, interpretacao.pedidos)
    numeros = {Decimal(str(valor)) for valor in valores if valor is not None}
    # "Contratar alguém" implica uma pessoa sem escrever o número.
    if interpretacao.pessoas_a_mais not in (None, 1):
        numeros.add(Decimal(interpretacao.pessoas_a_mais))
    return numeros


def completa(interpretacao: Interpretacao) -> bool:
    """Tem o que a ferramenta precisa para calcular."""
    return {
        "promocao": interpretacao.desconto_reais is not None or interpretacao.desconto_pct is not None,
        "equipe": bool(interpretacao.estacao and interpretacao.pessoas_a_mais),
        "pedidos": interpretacao.pedidos is not None,
    }.get(interpretacao.intencao, True)


def _combinar(ia: Interpretacao, regras: Interpretacao) -> tuple[Interpretacao, str | None]:
    """Completa a IA com valores que as regras leram no texto, ou cede a vez a elas.

    Os valores das regras vêm da própria pergunta, então completar não cria números novos.
    """
    if ia.intencao == regras.intencao:
        faltantes = {campo: valor for campo, valor in regras.model_dump().items()
                     if valor is not None and getattr(ia, campo) is None}
        ia = ia.model_copy(update=faltantes)
    if not completa(ia) and completa(regras):
        return regras, "interpretacao_incompleta"
    return ia, None


def interpretar(pergunta: str) -> tuple[Interpretacao, dict]:
    """Devolve a interpretação e de onde ela veio. Qualquer falha da IA volta às regras."""
    reserva = interpretar_por_regras(pergunta)
    if not habilitada():
        return reserva, {"origem": "regras", "motivo": "desativada"}
    try:
        bruto = consultar_modelo(pergunta)
    except OllamaIndisponivel:
        return reserva, {"origem": "regras", "motivo": "indisponivel"}
    try:
        interpretacao = Interpretacao.model_validate_json(bruto)
    except (ValueError, TypeError):
        return reserva, {"origem": "regras", "motivo": "resposta_invalida"}
    if not _numeros_usados(interpretacao) <= numeros_da_pergunta(pergunta):
        return reserva, {"origem": "regras", "motivo": "numero_nao_citado"}
    interpretacao, motivo = _combinar(interpretacao, reserva)
    if motivo:
        return interpretacao, {"origem": "regras", "motivo": motivo}
    return interpretacao, {"origem": "ia_local", "modelo": MODELO, "prompt": VERSAO_PROMPT}


# ---------------------------------------------------------------- respostas calculadas

def _reais(centavos: int, sinal: bool = False) -> str:
    texto = explicacao._reais(centavos)
    return f"+{texto}" if sinal and centavos > 0 else texto


def _pedidos(quantidade: int) -> str:
    return f"{quantidade} pedido" + ("" if quantidade == 1 else "s")


def _pessoas(quantidade: int) -> str:
    return f"{quantidade} pessoa" + ("" if quantidade == 1 else "s")


_NA_ESTACAO = {"preparo": "no preparo", "embalagem": "na embalagem"}


class EntradaInvalida(ValueError):
    pass


def _variar(cenario: ParametrosSimulacao, **mudancas) -> ParametrosSimulacao:
    try:
        return ParametrosSimulacao.model_validate({**cenario.model_dump(), **mudancas})
    except ValidationError as erro:
        detalhe = erro.errors()[0]
        rotulo = _ROTULOS.get(detalhe["loc"][0], "Valor")
        raise EntradaInvalida(f"{rotulo}: {detalhe['msg']}") from erro


def _mudancas(interpretacao: Interpretacao, cenario: ParametrosSimulacao) -> dict:
    mudancas = {}
    if interpretacao.desconto_reais is not None:
        mudancas["desconto"] = Decimal(str(interpretacao.desconto_reais))
    elif interpretacao.desconto_pct is not None:
        fracao = Decimal(str(interpretacao.desconto_pct)) / 100
        mudancas["desconto"] = (cenario.preco_venda * fracao).quantize(Decimal("0.01"), ROUND_HALF_UP)
    if interpretacao.pedidos is not None:
        mudancas["pedidos"] = interpretacao.pedidos
    if interpretacao.estacao and interpretacao.pessoas_a_mais:
        campo = f"pessoas_{interpretacao.estacao}"
        mudancas[campo] = getattr(cenario, campo) + interpretacao.pessoas_a_mais
    return mudancas


def _entendimento(interpretacao: Interpretacao, mudancas: dict) -> str:
    partes = []
    if "desconto" in mudancas:
        partes.append(f"desconto de {_reais(int(mudancas['desconto'] * 100))} por pedido")
    if "pedidos" in mudancas:
        partes.append(f"{_pedidos(mudancas['pedidos'])} recebidos")
    if interpretacao.estacao and interpretacao.pessoas_a_mais:
        partes.append(f"+{_pessoas(interpretacao.pessoas_a_mais)} {_NA_ESTACAO[interpretacao.estacao]}")
    if not partes:
        return {
            "regras": "Consulta às regras comerciais do iFood e da 99Food.",
            "fora_do_escopo": "Pergunta fora do que o simulador calcula.",
        }.get(interpretacao.intencao, "Faltou um valor para simular.")
    return "Simulei " + ", ".join(partes) + ". O restante vem do seu cenário atual."


def _responder_promocao(cenario: ParametrosSimulacao, promocional: ParametrosSimulacao) -> dict:
    resultado = analisar_promocao(ParametrosPromocao(base=cenario, promocional=promocional))
    base, promocao, equilibrio = (resultado[chave] for chave in ("base", "promocional", "equilibrio"))
    diferenca = promocao["contribuicao_total_centavos"] - base["contribuicao_total_centavos"]
    desconto = _reais(promocao["desconto_centavos"])
    minimo = equilibrio["pedidos_concluidos_minimos"]
    capacidade = equilibrio["maximo_concluidos_no_limite"]
    prontos = promocao["pedidos_concluidos"]
    margem = _reais(promocao["contribuicao_por_pedido_centavos"])
    situacao = equilibrio["situacao"]
    textos = {
        "meta_atingida": f"Sim, nas hipóteses informadas. Com {desconto} de desconto, {_pedidos(prontos)} prontos "
                         f"deixam {_reais(diferenca, True)} em relação ao turno atual.",
        "volume_insuficiente": f"Ainda não. Com {desconto} de desconto, seriam necessários {_pedidos(minimo)} prontos, "
                               f"e o turno simulado termina com {prontos}. A cozinha comporta até {capacidade}, mas o "
                               "simulador não prevê se esses pedidos virão.",
        "capacidade_insuficiente": f"Não neste turno. Com {desconto} de desconto, seriam necessários {_pedidos(minimo)} "
                                   f"prontos para manter o resultado, mas a equipe conclui no máximo {capacidade}.",
        "fora_dos_limites": f"Não. Com {desconto} de desconto, seriam necessários {_pedidos(minimo)} prontos, acima "
                            "do limite do simulador.",
        "impossivel_financeiramente": f"Não, em nenhum volume. Com {desconto} de desconto, cada pedido deixa {margem}, "
                                      "e isso não alcança o resultado atual.",
        "limite_de_perda_excedido": f"Não. Com {desconto} de desconto, cada pedido deixa {margem}: vender mais aumenta a perda.",
    }
    dados = [
        {"rotulo": "Pedidos prontos necessários", "valor": str(minimo) if minimo is not None else "Nenhum volume compensa"},
        {"rotulo": "Capacidade do turno", "valor": _pedidos(capacidade)},
        {"rotulo": "Prontos na hipótese", "valor": f"{prontos} de {promocao['pedidos_recebidos']}"},
        {"rotulo": "Diferença no turno", "valor": _reais(diferenca, True)},
    ]
    maximo = equilibrio["desconto_maximo_centavos"]
    if maximo is not None:
        dados.append({"rotulo": f"Maior desconto que se paga com {prontos} prontos",
                      "valor": _reais(maximo) if maximo else "Nenhum desconto"})
    return {"resposta": textos[situacao], "dados": dados, "alertas": resultado["alertas"],
            "ferramenta": "analisar_promocao"}


def _responder_equipe(cenario: ParametrosSimulacao, reforcado: ParametrosSimulacao, base: ParametrosSimulacao,
                      interpretacao: Interpretacao) -> dict:
    antes, depois = executar_simulacao(base), executar_simulacao(reforcado)
    prontos_antes, prontos_depois = (r["operacao"]["pedidos_concluidos"] for r in (antes, depois))
    total_antes, total_depois = (r["financeiro"]["contribuicao_total_centavos"] for r in (antes, depois))
    reforco = f"{_pessoas(interpretacao.pessoas_a_mais)} a mais {_NA_ESTACAO[interpretacao.estacao]}"
    if prontos_depois > prontos_antes:
        resposta = (f"Com {reforco}, os pedidos prontos passam de {prontos_antes} para {prontos_depois}, "
                    f"e o valor que sobra no turno aumenta {_reais(total_depois - total_antes)}.")
    else:
        resposta = f"Com {reforco}, os pedidos prontos continuam {prontos_antes}: essa estação não limita o turno."
        menor = depois["operacao"]["estacoes_menor_capacidade"]
        if menor and interpretacao.estacao not in menor:
            resposta += f" A estação com menor capacidade é {' e '.join(menor)}."
    return {
        "resposta": resposta,
        "dados": [
            {"rotulo": "Pedidos prontos", "valor": f"{prontos_antes} → {prontos_depois}"},
            {"rotulo": "Valor que sobra no turno", "valor": f"{_reais(total_antes)} → {_reais(total_depois)}"},
            {"rotulo": "Diferença", "valor": _reais(total_depois - total_antes, True)},
        ],
        "alertas": ["O custo da pessoa extra não está incluído. Compare a diferença com o quanto ela custaria no turno."],
        "ferramenta": "executar_simulacao",
    }


def _responder_pedidos(cenario: ParametrosSimulacao) -> dict:
    resultado = executar_simulacao(cenario)
    operacao = resultado["operacao"]
    resposta = (f"Com {_pedidos(operacao['pedidos_recebidos'])} recebidos, {operacao['pedidos_concluidos']} ficam prontos "
                f"no turno e {operacao['pedidos_pendentes']} continuam pendentes.")
    if operacao["gargalos_observados"]:
        resposta += f" Forma-se fila em {' e '.join(operacao['gargalos_observados'])}."
    return {
        "resposta": resposta,
        "dados": [
            {"rotulo": "Pedidos prontos", "valor": f"{operacao['pedidos_concluidos']} de {operacao['pedidos_recebidos']}"},
            {"rotulo": "Pendentes no fim", "valor": str(operacao["pedidos_pendentes"])},
            {"rotulo": "Valor que sobra no turno", "valor": _reais(resultado["financeiro"]["contribuicao_total_centavos"])},
        ],
        "alertas": ["O volume de pedidos é uma hipótese sua: o simulador não prevê demanda."],
        "ferramenta": "executar_simulacao",
    }


def _responder_regras(pergunta: str) -> dict:
    consulta = consultar_regras(ConsultaComercial(pergunta=pergunta))
    alertas = []
    if consulta["situacao"] == "com_fontes":
        alertas.append(consulta["orientacao"])
        if consulta["dados_faltantes"]:
            alertas.append("Para calcular no simulador, confirme no contrato: " + ", ".join(consulta["dados_faltantes"]) + ".")
    return {
        "resposta": consulta.get("resposta") or consulta["orientacao"],
        "dados": [],
        "alertas": alertas,
        "fontes": consulta["fontes"],
        "ferramenta": "consultar_regras",
    }


def responder(entrada: PerguntaAssistente) -> dict:
    interpretacao, origem = interpretar(entrada.pergunta)
    cenario = entrada.cenario
    mudancas = _mudancas(interpretacao, cenario)
    resposta = {"dados": [], "alertas": [], "fontes": [], "ferramenta": None}
    try:
        if interpretacao.intencao == "promocao" and "desconto" in mudancas:
            resposta.update(_responder_promocao(cenario, _variar(cenario, **mudancas)))
        elif interpretacao.intencao == "promocao":
            resposta["resposta"] = "Qual desconto você quer testar? Escreva o valor, por exemplo: desconto de R$ 5."
        elif interpretacao.intencao == "equipe" and interpretacao.estacao and interpretacao.pessoas_a_mais:
            volume = {"pedidos": mudancas["pedidos"]} if "pedidos" in mudancas else {}
            resposta.update(_responder_equipe(cenario, _variar(cenario, **mudancas), _variar(cenario, **volume),
                                              interpretacao))
        elif interpretacao.intencao == "pedidos" and "pedidos" in mudancas:
            resposta.update(_responder_pedidos(_variar(cenario, **mudancas)))
        elif interpretacao.intencao == "regras":
            resposta.update(_responder_regras(entrada.pergunta))
        else:
            resposta["resposta"] = ("Ainda não sei responder isso. Pergunte sobre desconto, equipe, quantidade de "
                                    "pedidos ou taxas do iFood e da 99Food.")
            resposta["exemplos"] = list(EXEMPLOS)
    except EntradaInvalida as erro:
        resposta["resposta"] = f"Não consegui simular com esses valores. {erro}"
    return {**resposta, "entendimento": _entendimento(interpretacao, mudancas),
            "interpretacao": interpretacao.model_dump(exclude_none=True), **origem}
