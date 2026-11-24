# Roteiro de demonstração

Em cerca de cinco minutos, mostre como o simulador ajuda a decidir entre baixar o desconto,
reforçar a equipe ou rever o volume de uma promoção. Use os valores iniciais e dados fictícios
para reproduzir os resultados.

## Preparação

Siga [Como executar](../README.md#como-executar) e abra <http://127.0.0.1:8010>.
Recarregue a página antes de começar para restaurar os valores iniciais.

## Da hipótese à decisão

| Tempo | Ação na tela | O que interpretar |
| --- | --- | --- |
| 0:00–1:00 | Na **Visão geral**, observe o turno inicial e clique em **Testar uma promoção**. | No turno inicial, 18 de 20 pedidos ficam prontos e a contribuição é de R$ 283,50. Com R$ 5 de desconto, nas mesmas condições, a contribuição cai para R$ 207,00. Seriam necessários 25 pedidos prontos para preservar a contribuição, mas a capacidade simulada é 22. |
| 1:00–2:00 | Em **Cenários**, abra **Editar hipótese**, mude **Pedidos recebidos na promoção (hipótese)** para 30 e clique em **Analisar promoção**. | Chegam 30 pedidos, 22 ficam prontos e 8 ficam pendentes. O volume é uma entrada fictícia que permite testar a operação. |
| 2:00–3:00 | Abra **Ver detalhes e alternativas**. Informe R$ 3,00 em **Desconto reduzido**, escolha **Preparo**, informe R$ 20,10 para o reforço e clique em **Comparar alternativas**. | O desconto menor deixa R$ 290,40, com 22 pedidos prontos. O reforço deixa R$ 310,50 com 27 prontos e R$ 290,40 após o custo adicional. Com esse empate financeiro, compare quantos pedidos ficam prontos e verifique se a equipe extra está disponível. |
| 3:00–4:00 | No mesmo resultado, abra **Simular pico de pedidos** e clique em **Comparar com pico**. | Na hipótese promocional com a equipe original, 22 ficam prontos nos dois casos. Concentrar as chegadas nos primeiros 15 minutos aumenta a maior fila de preparo de 6 para 24 e a espera média dos pedidos prontos de 5 para 20,75 minutos. |
| 4:00–5:00 | Em **Guardar e compartilhar cenário**, use **Baixar cenário JSON** e **Exportar resumo**. Abra o mesmo JSON em **Reabrir cenário**. | O arquivo permite rever a referência e os cálculos. O TXT registra hipóteses, custos e resultados para discutir a decisão. |

## Se quiser mostrar mais dados

- **Ficha técnica.** Em **Simulador → Calcular ingredientes por ficha técnica**, carregue o
  exemplo e calcule R$ 3,00 por porção. O botão **Usar custo no simulador** aplica o custo e
  altera os números do roteiro principal.
- **Canais e fontes.** Em **Comparar custos por canal**, mostre que comissão, pagamento, frete e
  divisão do desconto vêm das hipóteses informadas. Abra **Consultar regras de iFood e 99Food**
  e use a pergunta de exemplo para mostrar as fontes e os dados que precisam ser conferidos.
- **Referência por horário.** Em **Consultar pedidos de referência**, carregue o exemplo fictício
  para ver 82 pedidos concluídos e 3 cancelados pelo canal. São contagens por hora de criação.
  A simulação da cozinha usa a hipótese de demanda digitada.
- **Restaurante.** Abra a área, inicie a reprodução e selecione **Preparo** para comparar o momento
  do relógio com os indicadores do turno completo.

A contribuição calcula o que sobra depois do desconto, das taxas e dos custos variáveis considerados.
Impostos, salários regulares, aluguel e desperdício ficam fora. Os resultados descrevem os cenários
informados. A validação com gestores segue pendente, com roteiro em [teste de uso](teste-de-uso.md).

O [vídeo de 24 segundos](capturas/demo-promocao.mp4) registra uma versão anterior da interface.
