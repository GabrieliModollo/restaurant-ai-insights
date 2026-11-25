"""Agente local: um modelo no Ollama escolhe e chama as ferramentas do servidor MCP do simulador.

    python -m scripts.agente_mcp "Um desconto de R$ 5 se paga?"
    python -m scripts.agente_mcp "..." --saida docs/capturas/agente-mcp.json

Requer Ollama em 127.0.0.1:11434 com o modelo instalado e `requirements-mcp.txt`.
O modelo decide a ferramenta e os argumentos; os números vêm do motor. Se a resposta final
citar um número que não está na pergunta nem no resultado da ferramenta, ela é recusada e
substituída por um texto montado a partir do resultado.
"""

import argparse
import asyncio
import json
import sys
from decimal import Decimal
from http.client import HTTPConnection
from pathlib import Path
from time import perf_counter

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from scripts.avaliar_assistente import _numeros_de, numeros_exibidos
from src.simulador import explicacao

RAIZ = Path(__file__).resolve().parents[1]
INSTRUCAO = (
    "Você ajuda o gerente de um restaurante usando as ferramentas de um simulador. "
    "Para perguntas sobre desconto, chame testar_desconto com desconto_reais igual ao valor citado "
    "(e pedidos, se a pergunta informar). Depois responda em português, em até "
    "duas frases, usando apenas números do resultado da ferramenta. Converta centavos para reais. "
    'Exemplo: para "Um desconto de R$ 3 se paga?", chame testar_desconto com {"desconto_reais": 3}.'
)


def chat(modelo: str, mensagens: list[dict], ferramentas: list[dict]) -> dict:
    corpo = json.dumps({
        "model": modelo, "stream": False, "messages": mensagens, "tools": ferramentas,
        "options": {"temperature": 0, "num_ctx": 4096},
    })
    conexao = HTTPConnection("127.0.0.1", 11434, timeout=120)
    try:
        conexao.request("POST", "/api/chat", corpo, {"Content-Type": "application/json"})
        resposta = conexao.getresponse()
        if resposta.status != 200:
            raise RuntimeError(f"Ollama respondeu {resposta.status}")
        return json.loads(resposta.read(1_000_000))["message"]
    finally:
        conexao.close()


def esquema_para_ollama(esquema: dict) -> dict:
    """Simplifica o JSON Schema do MCP para o modelo: tipo e descrição de cada campo.

    Com anyOf/null, title e exclusiveMinimum, o Ollama 0.40 devolvia resposta vazia, sem chamada.
    A validação completa continua no servidor MCP.
    """
    propriedades = {}
    for nome, campo in esquema.get("properties", {}).items():
        tipos = [opcao for opcao in campo.get("anyOf", [campo]) if opcao.get("type") != "null"]
        propriedades[nome] = {"type": tipos[0].get("type", "string"), "description": campo.get("description", nome)}
    return {"type": "object", "required": esquema.get("required", []), "properties": propriedades}


def resposta_por_regras(resultado: dict) -> str:
    reais = explicacao._reais
    se_paga = "Sim, se paga" if resultado["se_paga"] else "Não se paga neste turno"
    texto = (f"{se_paga}: seriam necessários {resultado['pedidos_prontos_necessarios']} pedidos prontos "
             f"e a equipe conclui no máximo {resultado['capacidade_do_turno']}.")
    return texto + f" Diferença no turno: {reais(resultado['diferenca_no_turno_centavos'])}."


async def executar(pergunta: str, modelo: str, oferecidas: set[str] | None = None) -> dict:
    processo = StdioServerParameters(command=sys.executable, args=["-m", "src.simulador.mcp_servidor"], cwd=RAIZ)
    passos = []
    async with stdio_client(processo) as (leitura, escrita):
        async with ClientSession(leitura, escrita) as sessao:
            await sessao.initialize()
            inventario = [t for t in (await sessao.list_tools()).tools if not oferecidas or t.name in oferecidas]
            ferramentas = [{"type": "function", "function": {
                "name": t.name, "description": t.description or t.title or t.name, "parameters": esquema_para_ollama(t.inputSchema),
            }} for t in inventario]
            passos.append({"tipo": "ferramentas", "nomes": [t.name for t in inventario]})
            mensagens = [{"role": "system", "content": INSTRUCAO}, {"role": "user", "content": pergunta}]
            permitidos = set(numeros_exibidos(pergunta))
            resultado = None
            for _ in range(3):
                inicio = perf_counter()
                mensagem = chat(modelo, mensagens, ferramentas)
                segundos = round(perf_counter() - inicio, 1)
                chamadas = mensagem.get("tool_calls") or []
                if not chamadas:
                    passos.append({"tipo": "resposta_modelo", "texto": mensagem.get("content", "").strip(), "segundos": segundos})
                    break
                mensagens.append(mensagem)
                for chamada in chamadas:
                    nome, argumentos = chamada["function"]["name"], chamada["function"]["arguments"]
                    passos.append({"tipo": "chamada", "ferramenta": nome, "argumentos": argumentos, "segundos": segundos})
                    retorno = await sessao.call_tool(nome, argumentos)
                    if retorno.isError:
                        erro = " ".join(getattr(c, "text", "") for c in retorno.content)
                        passos.append({"tipo": "erro_ferramenta", "texto": erro})
                        mensagens.append({"role": "tool", "content": erro})
                        continue
                    resultado = retorno.structuredContent
                    passos.append({"tipo": "resultado", "dados": resultado})
                    _numeros_de(resultado, permitidos)
                    mensagens.append({"role": "tool", "content": json.dumps(resultado, ensure_ascii=False)})
    final = next((p for p in reversed(passos) if p["tipo"] == "resposta_modelo"), None)
    sem_origem = sorted(str(n) for n in numeros_exibidos(final["texto"]) - permitidos) if final else []
    if resultado is None:
        # Sem resultado de ferramenta, nenhum número pode aparecer além dos da pergunta.
        texto = final["texto"] if final else ""
        conclusao = ({"origem": "modelo", "texto": texto} if texto and not sem_origem else
                     {"origem": "recusada", "texto": "O modelo não consultou o simulador; a resposta foi descartada.",
                      "numeros_recusados": sem_origem})
    elif final and final["texto"] and not sem_origem:
        conclusao = {"origem": "modelo", "texto": final["texto"]}
    else:
        conclusao = {"origem": "regras", "texto": resposta_por_regras(resultado), "numeros_recusados": sem_origem}
    return {"pergunta": pergunta, "modelo": modelo, "passos": passos, "conclusao": conclusao}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pergunta", nargs="?", default="Um desconto de R$ 5 se paga?")
    parser.add_argument("--modelo", default="qwen2.5:3b", help="o 1.5B da interface não chamou a ferramenta com confiança")
    parser.add_argument("--saida", type=Path, help="salva a transcrição em JSON")
    # Modelos pequenos erram com esquemas grandes; por padrão, só a ferramenta enxuta é oferecida.
    parser.add_argument("--ferramentas", default="testar_desconto",
                        help="ferramentas oferecidas ao modelo, separadas por vírgula ('todas' para o inventário completo)")
    argumentos = parser.parse_args()
    oferecidas = None if argumentos.ferramentas == "todas" else set(argumentos.ferramentas.split(","))
    transcricao = asyncio.run(executar(argumentos.pergunta, argumentos.modelo, oferecidas))
    texto = json.dumps(transcricao, ensure_ascii=False, indent=2)
    if argumentos.saida:
        argumentos.saida.write_text(texto + "\n", encoding="utf-8")
    print(texto)


if __name__ == "__main__":
    main()
