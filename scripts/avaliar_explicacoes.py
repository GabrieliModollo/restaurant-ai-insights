"""Compara explicações por regras e por IA em cenários fictícios verificáveis."""

import argparse
import json
import os
import re
from time import perf_counter

from src.simulador.explicacao import explicar_promocao
from src.simulador.parametros import campos_para_interface
from src.simulador.promocoes import ParametrosPromocao

CASOS = (
    ("capacidade_insuficiente", {"desconto": 5}, ("20", "18", "25", "22")),
    ("contribuicao_negativa", {"desconto": 25}, ("20", "18", "−R$ 5,50")),
    ("turnos_diferentes", {"desconto": 5, "pedidos": 28, "duracao_turno_min": 120},
     ("28", "27", "60", "120")),
)


def avaliar(com_ia: bool) -> tuple[list[dict], bool]:
    padrao = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}
    resultados = []
    passou = True
    for caso, mudancas, fatos_esperados in CASOS:
        parametros = ParametrosPromocao(base=padrao, promocional={**padrao, **mudancas})
        os.environ["RAI_IA_LOCAL"] = "0"
        regras = explicar_promocao(parametros)
        candidato = regras
        inicio = perf_counter()
        if com_ia:
            os.environ["RAI_IA_LOCAL"] = "1"
            candidato = explicar_promocao(parametros)
        segundos = round(perf_counter() - inicio, 2) if com_ia else None
        ausentes = [
            fato for fato in fatos_esperados
            if not re.search(rf"(?<!\d){re.escape(fato)}(?!\d)", candidato["texto"])
        ]
        origem_esperada = "ia_local" if com_ia else "regras"
        passou &= not ausentes and candidato["origem"] == origem_esperada
        resultados.append({
            "caso": caso,
            "por_regras": regras["texto"],
            "candidato": candidato,
            "fatos_ausentes": ausentes,
            "segundos_ia": segundos,
        })
    return resultados, passou


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--com-ia", action="store_true", help="Usa Ollama e exige respostas do modelo.")
    args = parser.parse_args()
    resultados, passou = avaliar(args.com_ia)
    print(json.dumps({"verificacao_automatica": passou, "casos": resultados}, ensure_ascii=False, indent=2))
    return 0 if passou else 1


if __name__ == "__main__":
    raise SystemExit(main())
