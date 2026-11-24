# Evidências de produto para o simulador

Síntese dos rascunhos de 5 a 23 de novembro de 2026. As fontes ajudam a justificar hipóteses de
produto. Os exemplos do simulador continuam fictícios, e a facilidade de uso permanece a validar.

| Tema | Evidência e alcance | Decisão no simulador |
| --- | --- | --- |
| **Ficha técnica e padronização** | O estudo Sebrae/Abrasel trata do uso de fichas em bares e restaurantes brasileiros. O portfólio Sebraetec detalha medidas, insumos e rendimento como escopo de consultoria. São fontes de tipos diferentes. [Estudo Sebrae/Abrasel](https://agenciasebrae.com.br/economia-e-politica/estudo-inedito-mapeia-caracteristicas-que-influenciam-a-produtividade-dos-bares-e-restaurantes-no-pais/) · [Sebraetec](https://portfolio-sebraetec.sebrae.com.br/fichas/14062-9--elaboracao-de-cardapio-e-ou-fichas-tecnicas-para-segmentos-de-alimentacao) | RAI-009 · custo teórico por porção, conversão de unidade e data do preço. Usar um teste fictício com compra em kg e consumo em g. |
| **Preço de compra e porcionamento** | Relatos individuais levantam hipóteses sobre conferir preço por tamanho de embalagem e padronizar porções no pico. País e porte dos autores nem sempre são verificáveis. [Relato sobre fornecedores](https://www.reddit.com/r/FoodService/comments/1xnxjun/restaurant_owners_how_do_you_track_supplier_price/) · [Relato sobre porções](https://www.reddit.com/r/restaurantowners/comments/1e6lomz) | Mostrar a data e calcular o custo na unidade da receita. Tratar consumo real, rendimento e atualização por histórico de compra como hipóteses posteriores. |
| **Contribuição, lucro e caixa** | A National Restaurant Association descreve pressões simultâneas de despesas e insumos em operações dos EUA. O levantamento Sebrae repercutido pela Abrasel aborda contas pessoais e empresariais em pequenos negócios de vários setores. [Análise setorial dos EUA](https://www.restaurant.org/research-and-media/research/restaurant-economic-insights/analysis-commentary/elevated-costs-continue-to-pressure-restaurant-profitability/) · [Levantamento multissetorial](https://nlrj.abrasel.com.br/noticias/noticias/61-pequenos-empreendedores-misturam-contas-pessoais-empresariais-sebrae260327095547/) | RAI-013 · explicar quais custos entram na contribuição e deixar explícitas as despesas excluídas, inclusive ao simular uma mudança de equipe. |
| **Promoção e capacidade de atendimento** | Há material sobre percepção de valor em promoções e orientação prática sobre escalas. São referências contextuais: o efeito de desconto na demanda e o efeito de escala no tempo de preparo dependem de dados da própria operação. [Promoções e valor percebido](https://bonito.abrasel.com.br/noticias/noticias/black-friday-data-cliente-bares-restaurantes-mais-satisfeito-aponta-estudo261119054757/) · [Guia de escalas](https://uniaooestemg.abrasel.com.br/noticias/noticias/abrasel-lanca-guia-para-bares-e-restaurantes-montarem-as-escalas-do-fim-da-6x1261119054819/) | RAI-008 · comparar a meta financeira com pedidos concluídos. O volume recebido é uma hipótese fornecida na demonstração. |

## Como as prioridades foram escolhidas

1. **Ficha técnica e promoção.** A pessoa consegue seguir a mesma história da compra do ingrediente à
   decisão sobre desconto. Os critérios podem ser verificados com uma receita e um turno fictícios.
2. **Explicação dos resultados.** A próxima verificação é entender se a pessoa distingue contribuição
   de lucro e pedidos recebidos de concluídos. O teste do portfólio pode usar casos reproduzíveis,
   enquanto a validação com operadores fica registrada como etapa futura.
3. **Hipóteses de expansão.** Estoque, perdas, caixa, tributos, escalas e sistemas contábeis ficaram
   como temas de pesquisa. Seria necessário entender decisões, dados de entrada e custos de cada
   fluxo antes de incluí-los.

## Rastreabilidade

Foram agrupadas URLs repetidas, reposts e observações sobre o mesmo tema. Estudos setoriais,
consultorias, indicadores agregados e relatos têm alcances diferentes. Um relato esclarece uma
possível situação de uso, sem estimar sua frequência. Consulte os materiais originais para os
recortes e os identificadores provisórios.

- Base e primeiras rodadas. [#9](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/9) · [#11](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/11) · [#12](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/12) · [#13](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/13) · [#14](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/14)
- Compras, rendimento e operação. [#15](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/15) · [#16](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/16) · [#17](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/17) · [#18](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/18) · [#19](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/19)
- Limites, percepção de valor e despesas. [#20](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/20) · [#21](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/21) · [#22](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/22) · [#23](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/23) · [#24](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/24)
