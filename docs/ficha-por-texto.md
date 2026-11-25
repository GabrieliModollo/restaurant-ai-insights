# Ficha técnica a partir de texto

Em **Simulador → Calcular ingredientes por ficha técnica**, cole a receita em **Colar a receita** e
clique em **Preencher com o texto**. Os ingredientes reconhecidos **preenchem o formulário** para a
pessoa revisar; o custo continua sendo calculado em **Calcular custo**, pela mesma regra de sempre.
Rota: `POST /api/ficha-tecnica/texto` com `{"texto": "...", "data_preco": "AAAA-MM-DD"}`.

## Como lê

| Etapa | O que faz |
| --- | --- |
| Regras | Por linha: preço (`R$ 20`, `48 reais`), quantidades com unidade (g, kg, mL, L, un), dúzia e preço por unidade (`R$ 38 o quilo`, `R$ 60/kg`). A quantidade mais perto do preço é a compra; a outra, o uso. |
| IA local (opcional) | Com `RAI_IA_LOCAL=1`, o `qwen2.5:3b` lê o texto todo e devolve JSON (prompt `ficha-texto-v2`, dois exemplos). |
| Combinação | Se as regras leram a linha, **os números são das regras** e a IA só melhora o nome. Ingredientes que só a IA encontrou entram **marcados para conferir**. |
| Proteções | Item da IA com número que não está no texto (exceto dúzia e o 1 de "o quilo") é descartado. Tudo passa pela validação de `Ingrediente` (unidades compatíveis, limites). Linhas sem preço são listadas como não entendidas. |

## Avaliação

`python -m scripts.avaliar_ficha_texto` (com `RAI_IA_LOCAL=1` para incluir a IA). Um ingrediente é
certo quando preço, quantidades e unidades coincidem. Rodada de 25/11/2026, nesta máquina:

| Conjunto | Só regras | Regras + IA | Números errados entregues |
| --- | --- | --- | --- |
| Ajuste (3 textos, 9 ingredientes) | 4 | 7 | 0 |
| Novos, não usados nos ajustes (3 textos, 9) | 2 | 6 | 0 |

- **Antes da combinação**, a IA sozinha acertou todos os nomes, mas errou o tamanho da compra em 6 de 12
  ingredientes (por exemplo, azeite "1 mL" em vez de 500 mL). Por isso os números das linhas que as regras
  entendem nunca vêm do modelo.
- As regras vão bem em listas ("Farinha: 150 g, pacote de 1 kg por R$ 20"), mas erram nomes e perdem
  ingredientes em frases e anotações soltas. Vários ingredientes na mesma linha continuam difíceis.
- **Tempo:** só regras, resposta imediata. Com a IA, de 37 a 41 s por texto e até 108 s quando o modelo
  ainda precisa ser carregado. A tela espera até 3 minutos e avisa durante a espera.

## Economia de digitação

Cada ingrediente tem 7 campos. A receita de exemplo dos testes, com 6 ingredientes, exigiria 42 campos
digitados; com o texto colado, a pessoa só revisa o que foi preenchido. O tempo de uma pessoa real
preenchendo e revisando **não foi medido**.

## Verificação

- `tests/test_ficha_texto.py`: formatos comuns, unidades incompatíveis, limites do texto, preço por
  unidade, combinação com a IA e falhas da IA (modelo simulado).
- Chrome, com IA local: receita organizada → 6 ingredientes, custo de R$ 14,53 aplicado ao simulador;
  anotação rápida → 2 ingredientes lidos só pela IA destacados para conferir; texto curto e texto sem
  preço com mensagens próprias; axe sem violações; 320 px sem estouro nos temas claro e noturno.
