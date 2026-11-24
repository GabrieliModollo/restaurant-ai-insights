# RAI-008 — promoções e ponto de equilíbrio da contribuição

## Como usar

Na **Visão geral**, **Testar uma promoção** calcula o exemplo fictício de R$ 5 e abre o resumo
com a meta, a capacidade e a diferença no turno. Em **Cenários**, escolha entre **Experimentar
exemplo** e **Testar minha promoção**. Os ajustes do exemplo e do cenário próprio ficam separados.

1. **Testar minha promoção** usa o cenário atual como referência se você ainda não guardou um
   cenário A. Em **Comparar cenários avançados**, você pode guardar, substituir ou limpar essa referência.
2. Abra **Editar hipótese** para ajustar desconto, demanda e equipe. Use o **Simulador** para alterar
   outros parâmetros, como preço e ingredientes. Os ajustes que você fez na hipótese são preservados.
3. Se houver uma análise anterior, recalcule a hipótese com **Analisar promoção**. O resumo antigo
   fica sinalizado até o recálculo, e ações sobre esse resultado ficam indisponíveis.
4. Em **Ver detalhes e alternativas**, consulte a análise financeira, o desconto máximo e a
   explicação. Os dados da sessão são descartados ao recarregar a página.

As capturas abaixo registram a interface da primeira entrega da RAI-008.

![Análise de promoção com capacidade insuficiente](capturas/promocao-rai-008.png)

[Ver captura no celular](capturas/promocao-mobile-rai-008.png).

## Desconto menor ou reforço de equipe

Em **Ver detalhes e alternativas**, informe um desconto menor, a estação que receberia uma
pessoa a mais e o custo adicional dessa pessoa no turno. As duas opções usam o mesmo volume,
turno e demais custos da hipótese analisada. A tela mostra pedidos prontos, contribuição,
custo adicional e resultado ajustado por alternativa.

Com 30 pedidos recebidos, o desconto de R$ 3,00 com a equipe original resulta em R$ 290,40
de contribuição. Manter R$ 5,00 de desconto e acrescentar uma pessoa no preparo resulta
em R$ 310,50 antes do reforço. Com custo de R$ 20,10, ambas deixam R$ 290,40.

## Comparar custos por canal

Em **Ver detalhes e alternativas → Comparar custos por canal**, informe comissão, taxa de
pagamento e frete pago pela loja por pedido. Divida o desconto da hipótese entre a loja e a
plataforma. As duas parcelas devem somar o mesmo desconto exibido ao cliente nos dois canais.
As condições são editáveis e representam cenários, sem tarifas predefinidas de marketplaces.

Na convenção desta simulação, comissão e pagamento incidem separadamente sobre o preço do item
menos o desconto pago pela loja. Cada taxa é arredondada por pedido ao centavo, meio para cima.
O simulador também desconta ingredientes, embalagem e frete pago pela loja. A contribuição no
turno é calculada apenas para pedidos prontos. O resumo mostra o total do turno de referência e
avisa quando a duração da referência é diferente.

### Consultar regras de iFood e 99Food

Dentro da comparação por canal, abra **Consultar regras de iFood e 99Food**. Experimente
“Por que a mesma promoção pode deixar contribuições diferentes no iFood e na 99Food?”.
A busca local recupera paráfrases de guias oficiais por assunto e plataforma e compõe
uma explicação com links e datas de consulta. Fora dessa cobertura, a tela informa que
não encontrou uma fonte.

A consulta distingue orientações dos guias de condições da loja e pede os campos ainda
não preenchidos nos dois canais. Use **Comparar canais** para calcular com as condições
do seu cenário. A resposta atual usa síntese por regras e funciona sem instalar modelo.

## Fórmulas e convenções

Todas as decisões usam centavos inteiros. O financeiro e a operação existentes são reutilizados,
sem nova versão dos cálculos no JavaScript.

- Preço líquido = preço original − desconto.
- Desconto (%) = desconto ÷ preço original × 100.
- Taxa do canal = preço líquido × taxa (%), **arredondada por pedido ao centavo, meio para cima**.
- Contribuição unitária = preço líquido − taxa arredondada − ingredientes − embalagem.
- Contribuição total = contribuição unitária × **pedidos concluídos**.
- Diferença absoluta = promoção − base.
- Variação (%) = diferença ÷ **valor absoluto da base** × 100. Assim, o sinal indica aumento ou redução
  também para bases negativas; com base zero, retorna `null`. A convenção é explicada na interface.
  `Fraction` calcula o percentual; a conversão para `float` acontece apenas na saída, para exibição.

O problema de equilíbrio é **n × u ≥ B**, para inteiros n ≥ 0: u é a contribuição unitária
promocional, B é a contribuição total da base e n conta conclusões, não recebimentos.

| Condição | Solução matemática |
| --- | --- |
| B > 0 e u > 0 | Mínimo = teto(B ÷ u), calculado por divisão inteira |
| B > 0 e u ≤ 0 | Não existe volume que compense a base positiva |
| B ≤ 0 e u ≥ 0 | Mínimo = 0; qualquer quantidade mantém contribuição ≥ B |
| B ≤ 0 e u < 0 | Intervalo de 0 até piso(B ÷ u); vender mais pode deixar o total abaixo da base |

Adicionais sobre a base = máximo(0, mínimo − conclusões da base); `null` se não há solução.
O mínimo zero para base negativa **não** indica equilíbrio do negócio ou recomendação de parar
de operar. O máximo admissível, quando existe, é exibido separadamente e não é uma meta de crescimento.

## Limite operacional

Além de calcular a meta financeira, o servidor simula o maior volume de pedidos recebidos permitido
por `CAMPOS` (atualmente 1.000), com equipe, tempos e duração da hipótese promocional.

Esse resultado é um teto de conclusões **dentro deste modelo**: aumentando N, a chegada do k-ésimo
pedido uniforme, (k − 1) × turno/N para k começando em 1, não fica mais tarde. O primeiro chega
no minuto zero, como em `operacao.py`. As duas filas FIFO, tempos constantes e pessoas
fixas preservam a ordem e não atrasam a conclusão do k-ésimo pedido. Assim, aumentar recebimentos
não diminui o total concluído. Há teste dessa propriedade em diferentes configurações.

O **desconto máximo** usa o número de pedidos que efetivamente ficam prontos na hipótese atual,
com a equipe e a demanda informadas. Usa a mesma regra de taxa por pedido e retorna o maior centavo
de desconto que preserva a contribuição da base. R$ 0,00 indica que a hipótese só mantém a base sem
desconto. O valor fica ausente quando nenhum pedido foi concluído ou quando até desconto zero deixa
a contribuição abaixo da base. Mudanças de equipe deixam explícito que o custo adicional de pessoal
está fora da contribuição.

A meta pode ser financeiramente impossível, exceder o limite de recebimentos, exceder as conclusões
possíveis ou caber no modelo mas não na hipótese atual. A resposta distingue esses casos de uma
hipótese que já iguala/supera a base. Para margem negativa, uma hipótese pior que a base recebe
`limite_de_perda_excedido`, nunca uma sugestão de aumentar o volume.

Não se converte o mínimo de conclusões em promessa de pedidos recebidos. A demanda é sempre uma
hipótese, não um efeito atribuído ao desconto. Mudanças de outros parâmetros e turnos diferentes
geram avisos: a diferença pode não decorrer apenas da promoção.

## Exemplo conferido

Cenário padrão: preço R$ 35, ingredientes R$ 12, embalagem R$ 2 e taxa 15%.
Com 20 pedidos recebidos, 18 são concluídos: contribuição unitária R$ 15,75 e total R$ 283,50.

Desconto de R$ 5, mantendo demanda e operação: taxa por pedido R$ 4,50, contribuição unitária
R$ 11,50, total R$ 207,00. Diferenças: −R$ 4,25 por pedido e −R$ 76,50 no turno (−26,98%).
São necessárias **25 conclusões**, 7 além das 18 da base. Porém, mesmo recebendo 1.000 pedidos,
essa operação conclui no máximo **22** no turno. A meta não cabe nessa configuração operacional.

## Contrato novo, anteriores preservados

`POST /api/promocoes` recebe `{"base": {...}, "promocional": {...}}`. Cada objeto tem os mesmos
campos, limites e validações de `POST /api/simulacoes`. Não aceita propriedades extras ou números
como texto. Erros usam o envelope existente `{"erros": {...}}`, com nomes qualificados como
`promocional.desconto` e `base.pedidos`.

A resposta contém `base`, `promocional`, `diferencas`, `equilibrio`, `alertas`, `formulas` e
`identificacao`. Valores terminados em `_centavos` são inteiros, e não inclui a lista de eventos.
Nenhum endpoint anterior ganhou campos ou mudou de comportamento.

## Verificação reproduzível

Com o servidor da branch na porta 8020, Chrome instalado e as ferramentas opcionais da revisão RAI-007:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --host 127.0.0.1 --port 8020
```

Em outro terminal:

```powershell
.\.venv\Scripts\python.exe -m pytest
node --test "tests/js/*.test.mjs"
$env:NODE_PATH = "$PWD/.tmp-ui/node_modules"
node tests/browser/promocoes.cjs
```

Instalação opcional, se ainda não existir: `npm install --prefix .tmp-ui --no-package-lock --no-save playwright@1.58.2 @axe-core/playwright@4.11.1`.
`RAI_URL` muda o endereço do servidor; `RAI_SO_FLUXOS=1` pula apenas a matriz visual.
O roteiro anterior `tests/browser/interface.cjs` verifica os fluxos da RAI-007; aponte `RAI_URL`
para o mesmo servidor para verificar compatibilidade. As capturas do teste ficam em `tmp/`.

## Limitações

Revisão técnica de 2026-11-06: novas execuções de **225 testes Python e 104 JavaScript**,
24 combinações de promoções e 72 das seis áreas anteriores no Chrome, sem falhas detectadas.
Escopo, comandos, correção documental e restrição da reinstalação de dependências estão em
[`revisao-rai-008.md`](revisao-rai-008.md). Os resultados históricos abaixo são de outra execução.

Validação do código `d70c28c` em clone limpo: **225 testes Python, 104 JavaScript**, `pip check`
sem erros. Chrome: 24 combinações de largura/tema/sinal da margem, sem estouro ou violações
detectadas pelo axe. Fluxos novos e anteriores aprovados também contra o servidor desse clone.
Entrega em revisão no [PR #10](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/10).

- É equilíbrio da **contribuição entre cenários**, não o ponto de equilíbrio completo da empresa.
- Impostos, salários, aluguel, desperdício e custos de pedidos não concluídos continuam excluídos.
- Mesmo modelo de um produto, chegadas uniformes, tempos fixos, sem cancelamentos, pausas ou desistências.
- Sem LLM, previsão de vendas ou decisão automática sobre a melhor estratégia.
- Chrome sem janela com tamanhos e temas emulados não equivale a aparelho físico, toque ou leitor de tela.
  Usabilidade com pessoas reais e validação em outros navegadores continuam pendentes.


## Explicar este resultado

O botão usa a hipótese exibida e pede uma explicação ao servidor. Por padrão, a explicação é
por regras. Com Ollama local ativado, a aplicação identifica o modelo e mantém visível a origem
do texto. Veja [configuração e avaliação](explicacoes-ia.md).
