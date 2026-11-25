"""Mede a extração de ficha técnica a partir de texto: ingredientes certos, errados e para conferir.

    python -m scripts.avaliar_ficha_texto            # só regras
    RAI_IA_LOCAL=1 python -m scripts.avaliar_ficha_texto   # regras + IA local (qwen2.5:3b)

Um ingrediente é certo quando quantidade usada, quantidade comprada, unidades e preço coincidem.
"ajuste" orientou o prompt ficha-texto-v2; "novos" foi escrito depois e não foi usado para ajustes.
"""

import time
from src.simulador.ficha_texto import extrair_ficha, TextoFicha
ajuste = {
 "frases soltas": ("Na massa vão 200 gramas de farinha, e o saco de 5 kg sai por R$ 32.\nUso 3 ovos por porção; a bandeja de 30 custa R$ 24.\nO leite eu compro a R$ 5 o litro e vai 150 ml.",
   [(200,"g",5,"kg",3200),(3,"un",30,"un",2400),(150,"ml",1,"l",500)]),
 "anotacao rapida": ("hamburguer 180g (kg 45 reais)\npão 1 un pct c/ 6 R$ 9\nqueijo cheddar 2 fatias = 40g, peça 1kg R$ 55",
   [(180,"g",1,"kg",4500),(1,"un",6,"un",900),(40,"g",1,"kg",5500)]),
 "whatsapp": ("oi! pro brownie: chocolate 70g (barra de 1kg tá 48 reais), manteiga 30g (pote 200g R$ 11), açúcar 50 g - pacote 1kg R$ 5,50",
   [(70,"g",1,"kg",4800),(30,"g",200,"g",1100),(50,"g",1,"kg",550)]),
}
novos = {
 "salada (novo)": ("Alface: 2 folhas, pé com 20 folhas a R$ 4\nTomate 80 g, compro o kg por R$ 9\nAzeite 5 ml, frasco de 250 ml R$ 18",
   [(2,"un",20,"un",400),(80,"g",1,"kg",900),(5,"ml",250,"ml",1800)]),
 "cafe (novo)": ("pro cappuccino: leite 120ml (caixa 1L R$ 4,80) + café 18 g, pacote 500 g R$ 32 + canela 1 g, pote de 30 g por R$ 6",
   [(120,"ml",1,"l",480),(18,"g",500,"g",3200),(1,"g",30,"g",600)]),
 "acai (novo)": ("Açaí: 300 ml por copo, balde de 10 litros sai R$ 160. Granola 30 g, saco 1 kg R$ 25. Leite condensado 20 g, lata 395 g R$ 7,90",
   [(300,"ml",10,"l",16000),(30,"g",1,"kg",2500),(20,"g",395,"g",790)]),
}
def avaliar(conj):
    for nome, (texto, esperados) in conj.items():
        t0 = time.perf_counter(); r = extrair_ficha(TextoFicha(texto=texto, data_preco="2026-11-25")); dt = time.perf_counter()-t0
        obtidos = [(i["quantidade_usada"], i["unidade_uso"], i["quantidade_comprada"], i["unidade_compra"], i["preco_compra_centavos"]) for i in r["ingredientes"]]
        certos = sum(any(abs(o[0]-e[0])<1e-9 and o[1]==e[1] and abs(o[2]-e[2])<1e-9 and o[3]==e[3] and o[4]==e[4] for o in obtidos) for e in esperados)
        errados = len(obtidos) - certos
        print(f"{nome:16} certos={certos}/{len(esperados)} errados={errados} conferir={r['conferir']} desc_ia={r['itens_da_ia_descartados']} {r['origem']}/{r.get('motivo')} {dt:.0f}s | {[i['nome'] for i in r['ingredientes']]}")
if __name__ == "__main__":
    print("== ajuste")
    avaliar(ajuste)
    print("== novos")
    avaliar(novos)

