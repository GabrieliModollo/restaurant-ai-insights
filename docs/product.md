# Produto

## Problema

Mudar preço, desconto, custos, volume ou equipe afeta ao mesmo tempo o resultado financeiro e a
capacidade de atender. Uma conta unitária não mostra, por exemplo, que um pedido a mais pode
ficar preso na fila e não gerar receita dentro do turno.

## Público

- **Usuário principal:** pessoa que gerencia um pequeno restaurante e tem pouca familiaridade com
  software.
- **Demonstração do portfólio:** recrutadores, que precisam ver raciocínio de produto, regras
  testadas e decisões técnicas.

A facilidade de uso ainda não foi validada com usuários. O que existe até aqui é verificação técnica.
O roteiro do teste está em `docs/teste-de-uso.md`.

## Objetivo

Permitir comparar cenários de um turno, relacionando decisões comerciais e operacionais com
conclusão de pedidos, filas, espera, receita e contribuição, sempre deixando claras as hipóteses
do modelo.

## Escopo do MVP

- Um produto e turno inicial de 60 minutos.
- Chegadas regulares; estações de preparo e embalagem com filas FIFO.
- Cada pessoa atende um pedido por vez, com tempos constantes.
- Controles de preço, desconto em reais, quantidade de pedidos, ingredientes, embalagem, taxa
  percentual do canal, pessoas e tempo por estação, com unidades, limites e entrada numérica.
- Restaurante isométrico em Canvas 2D, com estações clicáveis.
- Indicadores de conclusão, filas, espera, receita e contribuição.
- Reprodução dos eventos com pausa, reinício, velocidade e relógio.
- Comparação entre um cenário A preservado e o cenário atual.
- Explicações por regras, identificadas como sem IA conectada.
- Aviso de simulação ilustrativa com dados fictícios.
- Primeiro uso compreensível: orientação inicial, linguagem clara, ajuda contextual e exemplos.

## Regras financeiras

- Preço líquido = preço − desconto.
- Taxa do canal = percentual sobre o preço líquido.
- Contribuição unitária = preço líquido − taxa − ingredientes − embalagem.
- Receita e contribuição atendidas consideram somente pedidos concluídos no turno.
- Contribuição não é lucro líquido. Ficam de fora impostos, salários, aluguel e desperdício.
- **Simplificação:** custos de pedidos ainda em processamento no fim do turno não são reconhecidos.

## Exclusões

- IA integrada, nesta primeira versão.
- Estimativa de aumento de demanda por desconto.
- Banco de dados, autenticação e serviços externos.
- Vários produtos, chegadas aleatórias, tempos variáveis, cancelamentos e desistências.
- Publicação da aplicação.

## Hipóteses do modelo

- O volume de pedidos é informado pela pessoa usuária; o desconto não o altera.
- Todo pedido recebido é aceito e os dados são fictícios.
- O resultado descreve o modelo. Não é previsão nem garantia de resultado real.

## Contexto do portfólio

Este é o primeiro de três projetos, implementados um por vez. Os outros dois ainda não têm
repositório e dependem de avaliar um modelo local ou outra integração de custo zero:

- **Assistente de requisitos:** esclarece solicitações e estrutura requisitos e critérios de
  aceitação, destacando ambiguidades, hipóteses e perguntas, sem apresentar regras inventadas como
  fatos.
- **Assistente de ocorrências:** classifica chamados e sugere encaminhamentos e respostas com base
  em procedimentos, citando fontes e exigindo revisão humana.
