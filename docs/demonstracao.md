# Roteiro de demonstração

Demonstração de cerca de 5 minutos, reproduzível a partir de um clone limpo. Todos os dados são
fictícios. Os números abaixo foram conferidos no navegador e valem para os valores indicados.

## Preparação

No PowerShell, depois de clonar o repositório e entrar na pasta:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --port 8010
```

Abra <http://127.0.0.1:8010>. Se a porta estiver ocupada, escolha outro número.

## Passos

1. **O que é.** Mostre o aviso: simulação ilustrativa, dados fictícios e sem IA conectada.
2. **Resultado sem preencher nada.** Leia o resumo: 18 de 20 pedidos ficaram prontos, e o valor que
   sobra é R$ 283,50. Explique que impostos, salários, aluguel e desperdício não foram descontados.
3. **Guardar e comparar.** Clique em "Guardar como cenário A" e mude o desconto para R$ 5. O número de
   pedidos não muda; o valor que sobra cai R$ 4,25 por pedido e R$ 76,50 no turno. Destaque que o
   desconto não altera a demanda: o volume é uma hipótese informada.
4. **Ver onde acumula.** Em "Ver exemplos fictícios", aplique "acúmulo no preparo". Os valores são
   substituídos e o cenário A é mantido. O resumo aponta onde os pedidos estão acumulando.
5. **Acompanhar o turno.** Clique em "Iniciar" e use a velocidade 4×. A cena mostra o momento do
   relógio, e os indicadores continuam sendo do turno completo. O gargalo só aparece no fim.
6. **Selecionar uma estação.** Clique em "Preparo" na cena ou no botão, e compare os dados do momento
   com os do turno completo.
7. **Comportamento em falha.** Digite um desconto maior que o preço. A mensagem aparece no campo, e a
   página avisa que os dados são do último cenário válido.
8. **Limites honestos.** Mostre `docs/progress.md`: o que foi verificado, o que não foi, e que a
   facilidade de uso ainda não foi validada com usuários.

## O que não afirmar

- Que o projeto tem IA integrada. Ele foi desenvolvido com assistência de IA, mas funciona só com
  regras e cálculos.
- Que o simulador aumenta resultados de um negócio. Nenhum benefício foi medido.
- Que a interface é fácil de usar. Isso depende do teste em `docs/teste-de-uso.md`.
