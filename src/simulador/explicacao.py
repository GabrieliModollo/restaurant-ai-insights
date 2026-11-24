"""Explicações de promoções com fatos calculados no servidor e uma leitura opcional por IA."""

import json
import os
import re
from http.client import HTTPException, HTTPConnection
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, ValidationError

from .promocoes import ParametrosPromocao, analisar_promocao

MODELO = "qwen2.5:1.5b"
CONTEXTO = 2048
VERSAO_PROMPT = "promocoes-v8"
_DADO_NA_PROSA = re.compile(r"\d|[$%<>{}\[\]]|\b(?:lucro|prejuízo|faturamento)\b", re.IGNORECASE)
_INSTRUCAO = (
    "Reescreva esta causa em uma frase curta, em português do Brasil, para o gerente de um restaurante. "
    "Use somente o que aparece na referência e preserve a relação entre causa e efeito. "
    "Escreva sem números, percentuais, valores, recomendações ou causas adicionais."
)
_CRITERIOS = {
    "capacidade": (r"\bmeta\b", r"capacidade|equipe"),
    "negativa": (r"perda|redu[çz]|diminu|piora", r"contribuiç"),
    "duracao": (r"duraç|período|turno", r"diferent|distint"),
}


class RespostaModelo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    explicacao: Annotated[str, StringConstraints(strip_whitespace=True, min_length=12, max_length=340)]


class OllamaIndisponivel(Exception):
    """O processo local não respondeu com sucesso."""


def habilitada() -> bool:
    return os.getenv("RAI_IA_LOCAL") == "1"


def _reais(centavos: int) -> str:
    reais, resto = divmod(abs(centavos), 100)
    sinal = "−" if centavos < 0 else ""
    return f"{sinal}R$ {reais:,}".replace(",", ".") + f",{resto:02d}"


def _referencia(resultado: dict) -> tuple[str, str, list[str]]:
    base, promocao, equilibrio = (resultado[chave] for chave in ("base", "promocional", "equilibrio"))
    recebidos = promocao["pedidos_recebidos"]
    concluidos = promocao["pedidos_concluidos"]
    fatos = f"Dos {recebidos} pedidos recebidos, {concluidos} foram concluídos."
    motivos = []
    criterios = []
    if equilibrio["situacao"] == "capacidade_insuficiente":
        meta = equilibrio["pedidos_concluidos_minimos"]
        limite = equilibrio["maximo_concluidos_no_limite"]
        fatos += f" A meta para manter a contribuição é de {meta} pedidos concluídos. A capacidade do turno é de {limite}."
        motivos.append(
            "A capacidade de concluir pedidos neste turno é menor do que a meta necessária para manter a contribuição."
        )
        criterios.append("capacidade")
    elif promocao["contribuicao_por_pedido_centavos"] < 0:
        margem = _reais(promocao["contribuicao_por_pedido_centavos"])
        fatos += f" Cada pedido promocional tem contribuição de {margem}."
        motivos.append(
            "A contribuição por pedido concluído é negativa, então concluir mais pedidos reduz a contribuição total."
        )

        criterios.append("negativa")
    turnos_diferentes = base["duracao_turno_min"] != promocao["duracao_turno_min"]
    if turnos_diferentes:
        fatos += (
            f" A base dura {base['duracao_turno_min']} minutos e a promoção dura {promocao['duracao_turno_min']} minutos."
            " A diferença de totais não mede o efeito isolado do desconto."
        )
        motivos.append(
            "Os dois totais de contribuição cobrem períodos de durações diferentes."
        )
        criterios.append("duracao")
    return fatos, " ".join(motivos) or equilibrio["explicacao"], criterios


def aplicar_resposta(conteudo: str, criterios: list[str]) -> str:
    texto = RespostaModelo.model_validate_json(conteudo).explicacao
    if _DADO_NA_PROSA.search(texto):
        raise ValueError("A resposta contém valores ou termos financeiros imprevistos.")
    if "capacidade" in criterios and re.search(r"sobrecarreg", texto, re.IGNORECASE):
        raise ValueError("O limite da hipótese não caracteriza sobrecarga observada.")
    if "duracao" in criterios and re.search(r"desconto|salári|funcionári|mão de obra", texto, re.IGNORECASE):
        raise ValueError("A conclusão sobre duração deve se ater à diferença entre períodos.")
    if any(not re.search(padrao, texto, re.IGNORECASE) for criterio in criterios for padrao in _CRITERIOS[criterio]):
        raise ValueError("A explicação não destacou a causa da conclusão.")
    return texto


def consultar_ollama(referencia: str) -> str:
    formato = RespostaModelo.model_json_schema()
    corpo = json.dumps({
        "model": MODELO,
        "stream": False,
        "format": formato,
        "options": {"temperature": 0, "num_ctx": CONTEXTO, "num_predict": 280},
        "messages": [
            {"role": "system", "content": _INSTRUCAO},
            {"role": "user", "content": referencia},
        ],
    })
    # Conexão direta, sem proxy, redirecionamento ou endereço escolhido pelo navegador.
    conexao = HTTPConnection("127.0.0.1", 11434, timeout=30)
    try:
        conexao.request("POST", "/api/chat", corpo, {"Content-Type": "application/json"})
        resposta = conexao.getresponse()
        if resposta.status != 200:
            raise OllamaIndisponivel
        bruto = resposta.read(65_537)
        if len(bruto) > 65_536:
            raise ValueError("Resposta muito grande.")
        conteudo = json.loads(bruto)["message"]["content"]
        if not isinstance(conteudo, str):
            raise ValueError("Resposta sem texto.")
        return conteudo
    except (OSError, HTTPException) as erro:
        raise OllamaIndisponivel from erro
    finally:
        conexao.close()


def explicar_promocao(parametros: ParametrosPromocao) -> dict:
    fatos, motivo, criterios = _referencia(analisar_promocao(parametros))
    resposta = {"texto": f"{fatos} {motivo}", "origem": "regras", "motivo": "desativada"}
    if not habilitada():
        return resposta
    try:
        conteudo = consultar_ollama(motivo)
        texto = aplicar_resposta(conteudo, criterios)
    except OllamaIndisponivel:
        return {**resposta, "motivo": "indisponivel"}
    except (ValidationError, ValueError, KeyError, TypeError):
        return {**resposta, "motivo": "resposta_invalida"}
    return {"texto": f"{fatos} {texto}", "origem": "ia_local", "modelo": MODELO, "prompt": VERSAO_PROMPT}
