"""Explicações de promoções com fatos calculados no servidor e uma leitura opcional por IA."""

import json
import os
from http.client import HTTPException, HTTPConnection
from typing import Literal

from pydantic import BaseModel, ConfigDict

from .promocoes import ParametrosPromocao, analisar_promocao

MODELO = "qwen2.5:1.5b"
CONTEXTO = 2048
VERSAO_PROMPT = "promocoes-v9"
_INSTRUCAO = (
    "Escolha a versão mais clara para o gerente de um restaurante. "
    "Responda apenas com a chave da versão no campo versao."
)
_VERSOES_SIMPLES = {
    "capacidade": "Mesmo com o turno no limite, a equipe consegue concluir menos pedidos do que a meta exige.",
    "negativa": "Cada pedido pronto reduz a contribuição total porque sua contribuição por pedido é negativa.",
    "duracao": "Os totais de contribuição cobrem turnos de durações diferentes.",
}


class RespostaModelo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    versao: Literal["padrao", "simples"]


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


def chamar_ollama(mensagens: list[dict[str, str]], formato: dict, modelo: str = MODELO,
                  limite_tokens: int = 280, tempo_limite: float = 30) -> str:
    """Envia mensagens ao Ollama local e devolve o texto da resposta, restrito ao esquema JSON."""
    corpo = json.dumps({
        "model": modelo,
        "stream": False,
        "format": formato,
        "options": {"temperature": 0, "num_ctx": CONTEXTO, "num_predict": limite_tokens},
        "messages": mensagens,
    })
    # Conexão direta, sem proxy, redirecionamento ou endereço escolhido pelo navegador.
    conexao = HTTPConnection("127.0.0.1", 11434, timeout=tempo_limite)
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


def consultar_ollama(opcoes: dict[str, str]) -> str:
    return chamar_ollama(
        [
            {"role": "system", "content": _INSTRUCAO},
            {"role": "user", "content": json.dumps(opcoes, ensure_ascii=False)},
        ],
        RespostaModelo.model_json_schema(),
    )


def explicar_promocao(parametros: ParametrosPromocao) -> dict:
    fatos, motivo, criterios = _referencia(analisar_promocao(parametros))
    resposta = {"texto": f"{fatos} {motivo}", "origem": "regras", "motivo": "desativada"}
    if not habilitada():
        return resposta
    if not criterios:
        return {**resposta, "motivo": "sem_alternativa"}
    opcoes = {"padrao": motivo, "simples": " ".join(_VERSOES_SIMPLES[criterio] for criterio in criterios)}
    try:
        versao = RespostaModelo.model_validate_json(consultar_ollama(opcoes)).versao
    except OllamaIndisponivel:
        return {**resposta, "motivo": "indisponivel"}
    except (ValueError, KeyError, TypeError):
        return {**resposta, "motivo": "resposta_invalida"}
    if versao == "padrao":
        return {**resposta, "motivo": "preferiu_regras"}
    return {"texto": f"{fatos} {opcoes[versao]}", "origem": "ia_local", "modelo": MODELO, "prompt": VERSAO_PROMPT}
