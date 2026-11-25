"""Ficha técnica a partir de texto colado: extrai os ingredientes para a pessoa revisar.

A IA local (opcional) lê o texto e devolve JSON; as regras assumem se ela falhar ou citar
um número que não está no texto. O resultado só preenche o formulário: o custo continua
sendo calculado por `calcular_ficha_tecnica`, depois da revisão.
"""

import json
import os
import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from . import explicacao
from .explicacao import OllamaIndisponivel, habilitada
from .ficha_tecnica import DataPreco, Ingrediente

MODELO = os.getenv("RAI_MODELO_FICHA", "qwen2.5:3b")
VERSAO_PROMPT = "ficha-texto-v2"
TEMPO_LIMITE = float(os.getenv("RAI_TEMPO_FICHA", "150"))


class TextoFicha(BaseModel):
    model_config = ConfigDict(extra="forbid")

    texto: Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=4000)]
    data_preco: DataPreco | None = None


class ItemExtraido(BaseModel):
    """Formato que o modelo devolve. Os números precisam estar escritos no texto."""

    model_config = ConfigDict(extra="forbid")

    nome: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
    preco_reais: float
    quantidade_comprada: float
    unidade_compra: Literal["g", "kg", "ml", "l", "un"]
    quantidade_usada: float
    unidade_uso: Literal["g", "kg", "ml", "l", "un"]


class Extracao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ingredientes: Annotated[list[ItemExtraido], Field(max_length=20)]


# ---------------------------------------------------------------- regras

_UNIDADES = {
    "kg": "kg", "quilo": "kg", "quilos": "kg", "kilo": "kg", "kilos": "kg",
    "g": "g", "gr": "g", "grama": "g", "gramas": "g",
    "l": "l", "lt": "l", "litro": "l", "litros": "l",
    "ml": "ml", "mililitro": "ml", "mililitros": "ml",
    "un": "un", "und": "un", "unidade": "un", "unidades": "un",
}
_NUMERO = r"\d+(?:[.,]\d+)?"
_PRECO = re.compile(rf"r\$\s*({_NUMERO})|({_NUMERO})\s*reais\b")
_QUANTIDADE = re.compile(rf"({_NUMERO})\s*({'|'.join(sorted(_UNIDADES, key=len, reverse=True))})\b")
_CONTAGEM = re.compile(rf"\b({_NUMERO})\s+([a-z]{{3,}})")
_DUZIA = re.compile(r"\b(meia\s+)?duzia\b")
# "R$ 38 o quilo", "R$ 5 por litro", "R$ 20/kg": a compra é 1 unidade, sem o número escrito.
_POR_UNIDADE = re.compile(r"^\s*(?:o|a|por|/|cada)\s*(kg|quilo|kilo|g|l|litro|ml|un|unidade)\b")
_USO = re.compile(r"\b(?:usa|uso|usado|usada|usar|vai|leva|porcao|receita)\b")


def _normalizar(texto: str) -> str:
    decomposicao = unicodedata.normalize("NFD", texto.casefold())
    return "".join(letra for letra in decomposicao if not unicodedata.combining(letra))


def _decimal(texto: str) -> Decimal:
    return Decimal(texto.replace(",", "."))


def numeros_do_texto(texto: str) -> set[Decimal]:
    numeros = {_decimal(n) for n in re.findall(_NUMERO, texto)}
    normalizado = _normalizar(texto)
    if "meia duzia" in normalizado:
        numeros.add(Decimal(6))
    if "duzia" in normalizado:
        numeros.add(Decimal(12))
    if any(_POR_UNIDADE.match(normalizado[m.end():]) for m in _PRECO.finditer(normalizado)):
        numeros.add(Decimal(1))
    return numeros


def _nome(original: str, fim_usado: int, contado: str | None) -> str:
    """Nome, em ordem: antes de ':' ou ' - '; antes do primeiro número; 'de X' depois da quantidade
    usada; a palavra contada ('2 ovos')."""
    limpo = original.strip(" -*•	")
    cabeca = re.split(r"[:–—]|\s-\s", limpo, maxsplit=1)[0].strip()
    if cabeca and cabeca != limpo and not re.search(r"\d", cabeca):
        return cabeca[:80]
    antes = re.split(r"\d", limpo, maxsplit=1)[0].strip(" ,;:-(")
    if len(re.sub(r"[^a-zA-ZÀ-ÿ]", "", antes)) >= 3:
        return antes[:80]
    depois = re.match(r"\s*(?:de|do|da)\s+([^\d,;(]+)", original[fim_usado:])
    if depois:
        return depois.group(1).strip(" .-")[:80]
    return (contado or "").capitalize()[:80]


def _linha_por_regras(original: str) -> dict | None:
    texto = _normalizar(original)
    preco = _PRECO.search(texto)
    if not preco:
        return None
    sem_preco = texto[:preco.start()] + " " * (preco.end() - preco.start()) + texto[preco.end():]
    quantidades = [(m.start(), _decimal(m.group(1)), _UNIDADES[m.group(2)], m.end()) for m in _QUANTIDADE.finditer(sem_preco)]
    por_unidade = _POR_UNIDADE.match(texto[preco.end():])
    if por_unidade:
        quantidades.append((preco.end(), Decimal(1), _UNIDADES.get(por_unidade.group(1), "un"), preco.end() + por_unidade.end()))
    duzia = _DUZIA.search(sem_preco)
    if duzia:
        quantidades.append((duzia.start(), Decimal(6 if duzia.group(1) else 12), "un", duzia.end()))
    contado = None
    if len(quantidades) == 1 and quantidades[0][2] == "un" and duzia:
        contagem = _CONTAGEM.search(sem_preco)
        if contagem and contagem.start() != duzia.start():
            quantidades.insert(0, (contagem.start(), _decimal(contagem.group(1)), "un", contagem.end(1)))
            contado = original[contagem.start(2):contagem.end(2)]
    if len(quantidades) < 2:
        return None
    centro_preco = (preco.start() + preco.end()) / 2
    compra = min(quantidades, key=lambda q: abs(q[0] - centro_preco))
    restantes = [q for q in quantidades if q is not compra]
    marcador = _USO.search(sem_preco)
    usado = min(restantes, key=lambda q: abs(q[0] - marcador.start())) if marcador else restantes[0]
    return {
        "nome": (nome := _nome(original, usado[3], contado))[:1].upper() + nome[1:],
        "preco_reais": float(_decimal(preco.group(1) or preco.group(2))),
        "quantidade_comprada": float(compra[1]),
        "unidade_compra": compra[2],
        "quantidade_usada": float(usado[1]),
        "unidade_uso": usado[2],
    }


def extrair_por_regras(texto: str) -> tuple[list[dict], list[str]]:
    itens, ignoradas = [], []
    for linha in texto.splitlines():
        linha = linha.strip()
        if not linha or not re.search(r"\d", linha):
            continue
        item = _linha_por_regras(linha)
        (itens.append(item) if item and item["nome"] else ignoradas.append(linha))
    return itens, ignoradas


# ---------------------------------------------------------------- IA local

_INSTRUCAO = (
    "Extraia os ingredientes de uma receita de restaurante para uma ficha técnica em JSON. "
    "Para cada ingrediente: nome curto; preco_reais = preço pago pela embalagem; quantidade_comprada e "
    "unidade_compra = tamanho da embalagem comprada por esse preço (pacote, garrafa, pote, peça, bandeja; "
    "'R$ 5 o litro' é 1 l; 'pct c/ 6' é 6 un; dúzia é 12 un); quantidade_usada e unidade_uso = quanto vai "
    "em uma porção. Unidades: g, kg, ml, l ou un. Copie só números escritos no texto; ignore linhas sem "
    "preço. Não calcule nada."
)


def _json_exemplo(*itens):
    campos = ("nome", "preco_reais", "quantidade_comprada", "unidade_compra", "quantidade_usada", "unidade_uso")
    return json.dumps({"ingredientes": [dict(zip(campos, item)) for item in itens]}, ensure_ascii=False)


_EXEMPLOS = (
    ("Farinha: 150 g por porção, pacote de 1 kg por R$ 20\n2 ovos, dúzia a R$ 12",
     _json_exemplo(("Farinha", 20, 1, "kg", 150, "g"), ("Ovos", 12, 12, "un", 2, "un"))),
    ("vai 100 ml de leite, que compro a R$ 5 o litro; pão de forma 2 fatias, pct c/ 20 R$ 9; manteiga 15g (pote 200g R$ 11)",
     _json_exemplo(("Leite", 5, 1, "l", 100, "ml"), ("Pão de forma", 9, 20, "un", 2, "un"),
                   ("Manteiga", 11, 200, "g", 15, "g"))),
)


def consultar_modelo(texto: str) -> str:
    mensagens = [{"role": "system", "content": _INSTRUCAO}]
    for pergunta, resposta in _EXEMPLOS:
        mensagens += [{"role": "user", "content": pergunta}, {"role": "assistant", "content": resposta}]
    mensagens.append({"role": "user", "content": texto})
    return explicacao.chamar_ollama(mensagens, Extracao.model_json_schema(), modelo=MODELO, limite_tokens=1200,
                                   tempo_limite=TEMPO_LIMITE)


def _numeros_usados(itens: list[dict]) -> set[Decimal]:
    return {Decimal(str(item[c])) for item in itens for c in ("preco_reais", "quantidade_comprada", "quantidade_usada")}


# ---------------------------------------------------------------- montagem

def _para_ingrediente(item: dict, data_preco: str) -> dict:
    try:
        centavos = int((Decimal(str(item["preco_reais"])) * 100).to_integral_value())
    except InvalidOperation as erro:
        raise ValueError("preço inválido") from erro
    ingrediente = Ingrediente(
        nome=item["nome"], preco_compra_centavos=centavos,
        quantidade_comprada=item["quantidade_comprada"], unidade_compra=item["unidade_compra"],
        quantidade_usada=item["quantidade_usada"], unidade_uso=item["unidade_uso"], data_preco=data_preco,
    )
    return ingrediente.model_dump()


def _montar(itens: list[dict], data_preco: str) -> tuple[list[dict], list[str]]:
    validos, recusados = [], []
    for item in itens:
        try:
            validos.append(_para_ingrediente(item, data_preco))
        except (ValidationError, ValueError):
            recusados.append(item.get("nome") or "ingrediente sem nome")
    return validos, recusados


def _mesmo_item(ia: dict, regra: dict) -> bool:
    return all(Decimal(str(ia[c])) == Decimal(str(regra[c])) for c in ("preco_reais", "quantidade_usada"))


def _combinar(itens_regras: list[dict], extraidos: list[dict], data_preco: str, citados: set[Decimal]):
    """Regras dão os números das linhas que entendem; a IA melhora o nome e completa as outras linhas.

    Itens da IA com número fora do texto ou que não passam na validação são descartados um a um.
    """
    aceitos = [item for item in extraidos
               if _numeros_usados([item]) <= citados and not _montar([item], data_preco)[1]]
    combinados, conferir, usados = [], [], set()
    for regra in itens_regras:
        par = next((k for k, item in enumerate(aceitos) if k not in usados and _mesmo_item(item, regra)), None)
        if par is not None:
            usados.add(par)
            regra = {**regra, "nome": aceitos[par]["nome"]}
        combinados.append(regra)
    for k, item in enumerate(aceitos):
        if k not in usados:
            conferir.append(len(combinados))
            combinados.append(item)
    return combinados, conferir, bool(usados or conferir), len(extraidos) - len(aceitos)


def extrair_ficha(entrada: TextoFicha) -> dict:
    data_preco = entrada.data_preco or date.today().isoformat()
    itens, ignoradas = extrair_por_regras(entrada.texto)
    origem = {"origem": "regras", "motivo": "desativada"}
    conferir, descartados = [], 0
    if habilitada():
        try:
            extraidos = [i.model_dump() for i in Extracao.model_validate_json(consultar_modelo(entrada.texto)).ingredientes]
        except OllamaIndisponivel:
            origem["motivo"] = "indisponivel"
        except (ValueError, TypeError):
            origem["motivo"] = "resposta_invalida"
        else:
            combinados, conferir, contribuiu, descartados = _combinar(itens, extraidos, data_preco, numeros_do_texto(entrada.texto))
            if contribuiu:
                itens = combinados
                ignoradas = ignoradas if not conferir else []
                origem = {"origem": "ia_local", "modelo": MODELO, "prompt": VERSAO_PROMPT}
            elif not extraidos:
                origem["motivo"] = "resposta_vazia"
            elif any(not _numeros_usados([i]) <= numeros_do_texto(entrada.texto) for i in extraidos):
                origem["motivo"] = "numero_nao_citado"
            else:
                origem["motivo"] = "resposta_invalida"
    ingredientes, recusados = _montar(itens, data_preco)
    return {"ingredientes": ingredientes[:20], "conferir": [i for i in conferir if i < 20],
            "linhas_ignoradas": ignoradas + recusados, "itens_da_ia_descartados": descartados, **origem}
