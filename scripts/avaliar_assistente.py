"""Mede a interpretação das perguntas do assistente: regras e, opcionalmente, IA local.

    python -m scripts.avaliar_assistente            # só regras (o mesmo do CI)
    python -m scripts.avaliar_assistente --com-ia   # requer Ollama e qwen2.5:1.5b

Um caso acerta quando a intenção e os valores coincidem com o esperado. A resposta final
continua sendo calculada pelo motor; aqui se mede apenas o entendimento da pergunta.
"""

import argparse
import json
import os
from time import perf_counter

from src.simulador import assistente

# (pergunta, interpretação esperada). Mistura frases diretas e paráfrases menos previsíveis.
CASOS = (
    ("Um desconto de R$ 5 se paga?", {"intencao": "promocao", "desconto_reais": 5}),
    ("Vale a pena dar 10% de desconto?", {"intencao": "promocao", "desconto_pct": 10}),
    ("dar 2 reais de desconto com 30 pedidos compensa?", {"intencao": "promocao", "desconto_reais": 2, "pedidos": 30}),
    ("Se eu baixar cinco reais no preço do lanche compensa?", {"intencao": "promocao", "desconto_reais": 5}),
    ("Fazer uma promoção de 3 reais vale a pena?", {"intencao": "promocao", "desconto_reais": 3}),
    ("Um cupom de 15 por cento dá prejuízo?", {"intencao": "promocao", "desconto_pct": 15}),
    ("e se eu der desconto?", {"intencao": "promocao"}),
    ("E se eu colocar mais uma pessoa no preparo?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1}),
    ("contratar duas pessoas na embalagem ajuda?", {"intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 2}),
    ("Botar mais um cozinheiro resolve a fila?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1}),
    ("Se eu tiver alguém a mais embalando melhora?", {"intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 1}),
    ("Quantos pedidos ficam prontos se chegarem 30?", {"intencao": "pedidos", "pedidos": 30}),
    ("Minha equipe dá conta de 40 pedidos?", {"intencao": "pedidos", "pedidos": 40}),
    ("E se o movimento subir para 50 pedidos no turno?", {"intencao": "pedidos", "pedidos": 50}),
    ("Quem paga o desconto no iFood?", {"intencao": "regras"}),
    ("Quanto a 99Food cobra de comissão?", {"intencao": "regras"}),
    ("O frete do iFood sai do meu bolso?", {"intencao": "regras"}),
    ("Qual o melhor sabor de pizza?", {"intencao": "fora_do_escopo"}),
    ("Como faço para contratar um contador?", {"intencao": "fora_do_escopo"}),
    ("Me conta uma piada", {"intencao": "fora_do_escopo"}),
)


# Conjunto separado, escrito depois do ajuste do prompt v2 e não usado para ajustá-lo.
CASOS_NOVOS = (
    ("Se eu fizer R$ 4 de desconto no combo, compensa?", {"intencao": "promocao", "desconto_reais": 4}),
    ("Um desconto de 20% no sábado dá lucro?", {"intencao": "promocao", "desconto_pct": 20}),
    ("Abaixar 1,50 no preço com 35 pedidos vale?", {"intencao": "promocao", "desconto_reais": 1.5, "pedidos": 35}),
    ("Promoção de oito reais faz sentido?", {"intencao": "promocao", "desconto_reais": 8}),
    ("Preciso de mais gente na cozinha?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 1}),
    ("Três funcionários a mais no preparo mudam alguma coisa?", {"intencao": "equipe", "estacao": "preparo", "pessoas_a_mais": 3}),
    ("Um embalador extra ajuda?", {"intencao": "equipe", "estacao": "embalagem", "pessoas_a_mais": 1}),
    ("Se vierem 60 pedidos, quantos atraso?", {"intencao": "pedidos", "pedidos": 60}),
    ("Com 25 pedidos a cozinha aguenta?", {"intencao": "pedidos", "pedidos": 25}),
    ("A taxa de pagamento da 99Food é cobrada de mim?", {"intencao": "regras"}),
    ("O iFood ajuda a bancar cupons?", {"intencao": "regras"}),
    ("Qual o horário de pico ideal para abrir?", {"intencao": "fora_do_escopo"}),
    ("Como aumento minhas avaliações?", {"intencao": "fora_do_escopo"}),
)


def _normalizar(interpretacao: dict) -> dict:
    return {chave: (float(valor) if isinstance(valor, (int, float)) else valor)
            for chave, valor in interpretacao.items() if valor is not None}


def avaliar(com_ia: bool, conjunto=CASOS) -> dict:
    os.environ["RAI_IA_LOCAL"] = "1" if com_ia else "0"
    casos = []
    for pergunta, esperado in conjunto:
        regras = _normalizar(assistente.interpretar_por_regras(pergunta).model_dump())
        inicio = perf_counter()
        final, origem = assistente.interpretar(pergunta)
        segundos = round(perf_counter() - inicio, 2)
        final = _normalizar(final.model_dump())
        casos.append({
            "pergunta": pergunta,
            "esperado": _normalizar(esperado),
            "regras_acertou": regras == _normalizar(esperado),
            "final": final,
            "final_acertou": final == _normalizar(esperado),
            "origem": origem["origem"],
            "motivo": origem.get("motivo"),
            "segundos": segundos if com_ia else None,
        })
    total = len(casos)
    return {
        "modo": "com_ia" if com_ia else "regras",
        "acertos_regras": sum(caso["regras_acertou"] for caso in casos),
        "acertos_finais": sum(caso["final_acertou"] for caso in casos),
        "respostas_da_ia": sum(caso["origem"] == "ia_local" for caso in casos),
        "total": total,
        "casos": casos,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--com-ia", action="store_true", help="consulta o Ollama local")
    argumentos = parser.parse_args()
    relatorio = {
        "ajuste": avaliar(argumentos.com_ia, CASOS),
        "novos": avaliar(argumentos.com_ia, CASOS_NOVOS),
    }
    print(json.dumps(relatorio, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
