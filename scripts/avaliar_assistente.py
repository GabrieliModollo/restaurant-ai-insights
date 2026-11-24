"""Avalia o assistente de ponta a ponta com os casos de tests/fixtures/avaliacao_assistente.json.

    python -m scripts.avaliar_assistente                 # só regras (o mesmo do CI)
    python -m scripts.avaliar_assistente --com-ia        # requer Ollama e qwen2.5:1.5b
    python -m scripts.avaliar_assistente --tabela        # resumo em Markdown
    python -m scripts.avaliar_assistente --verificar     # código 1 se um critério falhar

Critérios por caso:
- interpretação: intenção e valores iguais aos esperados;
- ferramenta: a função do motor chamada é a esperada para essa interpretação;
- fidelidade: todo número da resposta e dos indicadores vem da pergunta, do cenário, dos limites
  do simulador ou do resultado do motor recalculado aqui, de forma independente;
- texto: quando o caso exige, a resposta contém o trecho esperado.
"""

import argparse
import json
import os
import re
import sys
from decimal import Decimal
from pathlib import Path
from time import perf_counter

from src.simulador import assistente
from src.simulador.parametros import CAMPOS, ParametrosSimulacao
from src.simulador.promocoes import ParametrosPromocao, analisar_promocao
from src.simulador.simulacao import executar_simulacao

ARQUIVO = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "avaliacao_assistente.json"
PADRAO = {campo.nome: float(campo.padrao) for campo in CAMPOS}
_NUMERO_EXIBIDO = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?")


def carregar() -> dict:
    return json.loads(ARQUIVO.read_text(encoding="utf-8"))


def _normalizar(interpretacao: dict) -> dict:
    return {chave: (float(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else valor)
            for chave, valor in interpretacao.items() if valor is not None}


def ferramenta_esperada(esperado: dict) -> str | None:
    if esperado["intencao"] == "promocao":
        return "analisar_promocao" if {"desconto_reais", "desconto_pct"} & esperado.keys() else None
    return {"equipe": "executar_simulacao", "pedidos": "executar_simulacao",
            "regras": "consultar_regras"}.get(esperado["intencao"])


def numeros_exibidos(texto: str) -> set[Decimal]:
    texto = re.sub(r"99\s*Food", "", texto, flags=re.IGNORECASE)  # nome da plataforma, não um valor
    return {Decimal(numero.replace(".", "").replace(",", ".")) for numero in _NUMERO_EXIBIDO.findall(texto)}


def _numeros_de(valor, destino: set[Decimal]) -> None:
    """Coleta números de um resultado do motor. Inteiros podem ser centavos: guarda também em reais."""
    if isinstance(valor, dict):
        for item in valor.values():
            _numeros_de(item, destino)
    elif isinstance(valor, list):
        for item in valor:
            _numeros_de(item, destino)
    elif isinstance(valor, bool):
        return
    elif isinstance(valor, int):
        destino.update({Decimal(abs(valor)), Decimal(abs(valor)) / 100})
    elif isinstance(valor, (float, Decimal)):
        destino.add(abs(Decimal(str(valor))))


def numeros_rastreaveis(pergunta: str, cenario: dict, resposta: dict) -> set[Decimal]:
    """Recalcula, fora do assistente, o resultado da ferramenta para a interpretação usada."""
    permitidos = set(assistente.numeros_da_pergunta(pergunta))
    for campo in CAMPOS:
        permitidos.update({campo.minimo, campo.maximo})
    _numeros_de(cenario, permitidos)
    interpretacao = assistente.Interpretacao(**resposta["interpretacao"])
    _numeros_de(resposta["interpretacao"], permitidos)
    base = ParametrosSimulacao.model_validate(cenario)
    mudancas = assistente._mudancas(interpretacao, base)
    _numeros_de({chave: valor for chave, valor in mudancas.items()}, permitidos)
    permitidos.update(Decimal(str(valor)) for valor in mudancas.values())
    try:
        hipotese = ParametrosSimulacao.model_validate({**base.model_dump(), **mudancas})
    except ValueError:
        return permitidos
    if resposta["ferramenta"] == "analisar_promocao":
        _numeros_de(analisar_promocao(ParametrosPromocao(base=base, promocional=hipotese)), permitidos)
    elif resposta["ferramenta"] == "executar_simulacao":
        volume = {"pedidos": mudancas["pedidos"]} if "pedidos" in mudancas else {}
        totais = []
        for cenario_calculado in (hipotese, ParametrosSimulacao.model_validate({**base.model_dump(), **volume})):
            resultado = executar_simulacao(cenario_calculado)
            resultado["operacao"].pop("eventos", None)
            _numeros_de(resultado, permitidos)
            totais.append(resultado["financeiro"]["contribuicao_total_centavos"])
        # Única conta feita fora do motor: a diferença entre os dois totais, refeita aqui.
        _numeros_de(totais[0] - totais[1], permitidos)
    return permitidos


def avaliar_caso(caso: dict) -> dict:
    cenario = {**PADRAO, **caso.get("cenario", {})}
    esperado = _normalizar(caso["esperado"])
    inicio = perf_counter()
    try:
        resposta = assistente.responder(assistente.PerguntaAssistente(pergunta=caso["pergunta"], cenario=cenario))
    except Exception as erro:  # noqa: BLE001 — qualquer falha é registrada como erro do caso
        return {"id": caso["id"], "conjunto": caso["conjunto"], "erro": f"{type(erro).__name__}: {erro}"}
    segundos = round(perf_counter() - inicio, 2)
    exibido = resposta["resposta"] + " " + " ".join(item["valor"] for item in resposta["dados"])
    sem_origem = numeros_exibidos(exibido) - numeros_rastreaveis(caso["pergunta"], cenario, resposta)
    interpretacao_ok = _normalizar(resposta["interpretacao"]) == esperado
    return {
        "id": caso["id"],
        "conjunto": caso["conjunto"],
        "pergunta": caso["pergunta"],
        "interpretacao": interpretacao_ok,
        "ferramenta": resposta["ferramenta"] == caso.get("ferramenta", ferramenta_esperada(esperado)),
        "fidelidade": not sem_origem,
        "numeros_sem_origem": sorted(str(numero) for numero in sem_origem),
        "texto": caso.get("resposta_contem", "") in resposta["resposta"],
        "obtido": _normalizar(resposta["interpretacao"]),
        "origem": resposta["origem"],
        "motivo": resposta.get("motivo"),
        "segundos": segundos,
    }


def avaliar(com_ia: bool, casos: list[dict] | None = None) -> dict:
    os.environ["RAI_IA_LOCAL"] = "1" if com_ia else "0"
    casos = casos if casos is not None else carregar()["casos"]
    resultados = [avaliar_caso(caso) for caso in casos]
    resumo = {}
    for conjunto in dict.fromkeys(resultado["conjunto"] for resultado in resultados):
        do_conjunto = [resultado for resultado in resultados if resultado["conjunto"] == conjunto]
        validos = [resultado for resultado in do_conjunto if "erro" not in resultado]
        resumo[conjunto] = {
            "total": len(do_conjunto),
            "erros": len(do_conjunto) - len(validos),
            **{criterio: sum(resultado[criterio] for resultado in validos)
               for criterio in ("interpretacao", "ferramenta", "fidelidade", "texto")},
            "ia_usada": sum(resultado["origem"] == "ia_local" for resultado in validos),
        }
    return {"modo": "com_ia" if com_ia else "regras", "resumo": resumo, "casos": resultados}


def falhas(relatorio: dict, minimos: dict) -> list[str]:
    """Critérios do portão de qualidade: sem erros, fidelidade total e mínimos de interpretação."""
    problemas = []
    for conjunto, dados in relatorio["resumo"].items():
        if dados["erros"]:
            problemas.append(f"{conjunto}: {dados['erros']} caso(s) com erro")
        if dados["fidelidade"] < dados["total"]:
            problemas.append(f"{conjunto}: fidelidade {dados['fidelidade']}/{dados['total']}")
        if relatorio["modo"] == "regras" and dados["interpretacao"] < minimos.get(conjunto, 0):
            problemas.append(f"{conjunto}: interpretação {dados['interpretacao']} abaixo do mínimo {minimos[conjunto]}")
    return problemas


def tabela(relatorio: dict) -> str:
    linhas = ["| Conjunto | Casos | Interpretação | Ferramenta | Fidelidade | Texto esperado | IA usada |",
              "| --- | --- | --- | --- | --- | --- | --- |"]
    for conjunto, dados in relatorio["resumo"].items():
        linhas.append(f"| {conjunto} | {dados['total']} | {dados['interpretacao']} | {dados['ferramenta']} | "
                      f"{dados['fidelidade']} | {dados['texto']} | {dados['ia_usada']} |")
    return "\n".join(linhas)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--com-ia", action="store_true", help="consulta o Ollama local")
    parser.add_argument("--tabela", action="store_true", help="imprime só o resumo em Markdown")
    parser.add_argument("--verificar", action="store_true", help="falha se um critério do portão falhar")
    argumentos = parser.parse_args()
    dados = carregar()
    relatorio = avaliar(argumentos.com_ia, dados["casos"])
    print(tabela(relatorio) if argumentos.tabela else json.dumps(relatorio, ensure_ascii=False, indent=2))
    if argumentos.verificar:
        problemas = falhas(relatorio, dados["minimos_regras"])
        for problema in problemas:
            print(f"FALHOU: {problema}", file=sys.stderr)
        sys.exit(1 if problemas else 0)


if __name__ == "__main__":
    main()
