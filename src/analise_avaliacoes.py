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
                "classificacao": "",
            }
        resumo[restaurante]["quantidade"] += 1
        quantidade = resumo[restaurante]["quantidade"]
        media_atual = resumo[restaurante]["media"]
        resumo[restaurante]["media"] = media_atual + (
            avaliacao["nota"] - media_atual
        ) / quantidade

    for dados in resumo.values():
        media = dados["media"]
        dados["media"] = round(media, 2)

        if media >= 4:
            dados["classificacao"] = "Bom"
        elif media >= 3:
            dados["classificacao"] = "Regular"
        else:
            dados["classificacao"] = "Ruim"

    return resumo


if __name__ == "__main__":
    resultado = resumir_avaliacoes(avaliacoes)
    print(resultado)
