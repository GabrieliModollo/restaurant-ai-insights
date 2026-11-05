# Arquitetura

## Visão geral

```text
Navegador (HTML, CSS, JS puro, Canvas)
    │  GET /api/campos       limites e valores iniciais
    │  POST /api/simulacoes  parâmetros → financeiro + operação + eventos
    ▼
FastAPI / Uvicorn, na mesma origem
    │
    ▼
Núcleo, sem dependência de HTTP
    ├─ parametros.py   valida
    └─ simulacao.py    executa, nesta ordem:
         ├─ operacao.py     simula filas e gera eventos
         └─ financeiro.py   calcula sobre os pedidos concluídos
```

## Componentes

| Componente | Responsabilidade | Situação |
| --- | --- | --- |
| `src/simulador/parametros.py` | Limites, valores iniciais e validação | Pronto |
| `src/simulador/financeiro.py` | Cálculos em centavos | Pronto |
| `src/simulador/operacao.py` | Filas, capacidade, diagnóstico e eventos | Pronto |
| `src/simulador/simulacao.py` | Executa operação e finanças em sequência | Pronto |
| `src/simulador/api.py` | Rotas e entrega da interface | Pronto |
| `src/simulador/web/js/api.js` | Comunicação HTTP e descrição das falhas | Pronto |
| `src/simulador/web/js/execucao.js` | Só o pedido mais recente chega à tela | Pronto |
| `src/simulador/web/js/formulario.js` | Controles, limites e validação imediata | Pronto |
| `src/simulador/web/js/indicadores.js` | Exibição dos resultados | Pronto |
| `src/simulador/web/js/principal.js` | Liga formulário, API, indicadores e cena | Pronto |
| `src/simulador/web/js/cena/geometria.js` | Projeção isométrica, posições, escala e rótulos | Em revisão |
| `src/simulador/web/js/cena/modelo.js` | Resultado do servidor → itens e textos da cena | Em revisão |
| `src/simulador/web/js/cena/deteccao.js` | Estação sob um ponto da tela | Em revisão |
| `src/simulador/web/js/cena/desenho.js` | Desenho no Canvas | Em revisão |
| `src/simulador/web/js/cena/pagina.js` | Tamanho, clique, botões, detalhe e avisos | Em revisão |
| Reprodução | Relógio e estado derivado dos eventos | Planejado |
| Cenários | Guarda o cenário A e compara com o atual | Planejado |
| Explicações | Textos gerados por regras | Planejado |

## Decisões em vigor

| Decisão | Justificativa |
| --- | --- |
| Dinheiro em centavos inteiros | Evita erros de `float`, como 0,1 + 0,2 ≠ 0,3. |
| Taxa arredondada por pedido, meio centavo para cima (`ROUND_HALF_UP`) | Regra documentada e previsível; o total sempre fecha com valor por pedido × pedidos. |
| Tempo em `Fraction` | Permite decidir sem erro de arredondamento se um pedido terminou exatamente no fim do turno. |
| Pedido que termina exatamente no fim do turno é concluído | Regra explícita para o caso-limite. |
| Eventos calculados no servidor | A animação mostra o que foi simulado, em vez de criar uma segunda versão das regras. |
| `CAMPOS` como fonte única dos limites | Servidor e formulário não divergem. |
| Validação no navegador e no servidor | O navegador responde rápido; a decisão final é do servidor. |
| Interface e API na mesma origem, sem CDN nem etapa de build | Execução local simples, sem CORS e sem depender de internet. |
| "Gargalo observado" exige fluxo de entrada acima do ritmo **e** fila no fim do turno | Fila passageira ou pedido em andamento não provam sobrecarga. |
| "Menor capacidade" é um indicador separado de gargalo | Uma estação pode ser a mais lenta sem nunca formar fila. |
| Versões fixas em `requirements.txt`, só com o necessário a cada entrega | Instalação leve e reproduzível; o clone limpo prova que o núcleo não depende de HTTP. |
| Validação concentrada em `ParametrosSimulacao`; os cálculos confiam nela | Evita repetir regras. O modelo é imutável, então um valor não muda depois de validado. |
| Casas decimais conferidas com `quantize` e comparação exata | `normalize()` arredonda aos 28 dígitos do contexto padrão e deixaria passar valores inválidos. |
| Eventos no mesmo instante: fim, depois chegada, depois início | A pessoa termina um pedido antes de começar o próximo. Isso sustentará a reprodução. |
| Uvicorn sem extras | Requisito do projeto; instalação leve. |
| `httpx2` só para testes | `starlette.testclient` o exige e considera o `httpx` obsoleto; conferido no código do pacote. |
| `/docs` e `/redoc` desligados | Essas páginas do FastAPI carregam arquivos de um CDN, e o simulador não depende de recursos externos. |
| `/openapi.json` desligado | Ficou sem uso sem as páginas acima. Ele não depende de CDN e pode voltar quando for útil. |
| Canvas API nativa, sem biblioteca | Requisito do projeto; leve para 8 GB de RAM. |
| Cena desenhada só quando algo muda | Não há animação nesta entrega, e repetir o desenho gastaria processamento à toa. |
| Pilhas no lugar de muitos itens, com o total exato escrito | O custo do desenho não cresce com o número de pedidos, e nada é cortado em silêncio. |
| Estações na diagonal x + y = 12 do piso | Essa diagonal aparece reta na tela, o que evita rótulos sobre outros blocos em telas estreitas. |
| Clique testado contra o contorno do bloco, com alcance mínimo de 22 px | Inclui o topo desenhado e mantém o toque possível quando a cena encolhe. |
| Cancelar o pedido anterior e também conferir se a resposta é do pedido atual | O cancelamento pode chegar tarde, com a resposta já a caminho. |
| Lógica de JavaScript em funções testadas com `node --test` | Testa regras sem navegador e sem pacotes npm; o Node não é necessário para executar. |

## Decisões propostas

Serão confirmadas na entrega correspondente.

| Proposta | Justificativa |
| --- | --- |
| Cenário A como cópia imutável, em memória no navegador | Não exige banco de dados; recarregar a página o descarta. |
| Explicações geradas no servidor, em módulo Python | Ficam junto das regras e são testadas com `pytest`. |
