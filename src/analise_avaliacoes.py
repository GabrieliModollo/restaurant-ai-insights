avaliacoes = [
    {"restaurante": "Pizza Boa", "nota": 5},
    {"restaurante": "Burger House", "nota": 3},
    {"restaurante": "Pizza Boa", "nota": 4},
    {"restaurante": "Sushi Top", "nota": 2},
    {"restaurante": "Burger House", "nota": 5},
    {"restaurante": "Sushi Top", "nota": 1},
]


def resumir_avaliacoes(avaliacoes):
    resumo = {}

    for avaliacao in avaliacoes:
        restaurante = avaliacao["restaurante"]

        if restaurante not in resumo:
            resumo[restaurante] = {
                "quantidade": 0,
                "media": 0,
                "classificao": "",
            }
        resumo[restaurante]["quantidade"] += 1
        quantidade = resumo[restaurante]["quantidade"]
        media_atual = resumo[restaurante]["media"]
        resumo[restaurante]["media"] = round(
            media_atual + (avaliacao["nota"] - media_atual) / quantidade,
            2,
        )

        if resumo[restaurante]["media"] >= 4:
            resumo[restaurante]["classificao"] = "Bom"
        elif resumo[restaurante]["media"] >= 3:
            resumo[restaurante]["classificao"] = "Regular"
        else:
            resumo[restaurante]["classificao"] = "Ruim"

    return resumo


resultado = resumir_avaliacoes(avaliacoes)
print(resultado)
