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
| `src/simulador/web/js/cena/geometria.js` | Projeção isométrica, posições, escala e rótulos | Pronto |
| `src/simulador/web/js/cena/deteccao.js` | Estação sob um ponto da tela | Pronto |
| `src/simulador/web/js/cena/desenho.js` | Desenho no Canvas | Pronto |
| `src/simulador/web/js/cena/modelo.js` | Momento do relógio → itens e textos da cena | Pronto |
| `src/simulador/web/js/cena/pagina.js` | Tamanho, clique, reprodução, detalhe e avisos | Pronto |
| `src/simulador/web/js/cena/linha-do-tempo.js` | Estado em cada instante, a partir dos eventos | Pronto |
| `src/simulador/web/js/cena/reproducao.js` | Relógio e ciclo de quadros | Pronto |
| `src/simulador/web/js/navegacao.js` | Alterna formulário e resultados no celular | Pronto |
| `src/simulador/resumo.py` | Resumo do turno completo, gerado por regras | Em revisão |
| `src/simulador/web/js/comparacao.js` | Cenário A e diferenças em relação ao atual | Em revisão |
| `src/simulador/web/js/comparacao-pagina.js` | Mostra a comparação na página | Em revisão |
| `src/simulador/web/js/exemplos.js` | Aplica os exemplos fictícios ao formulário | Em revisão |

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
| Cena desenhada só quando algo muda | Mesmo tocando, o desenho só se repete quando o estado ou o minuto inteiro muda, para poupar processamento. |
| Estados da reprodução derivados só dos eventos | Evita uma segunda versão das regras em JavaScript. |
| Itens mudam de lugar no instante do evento, sem deslizar | O que aparece é sempre um estado real da simulação, e isso já respeita quem pede menos movimento. |
| Relógio com avanço máximo de 1 s por quadro | Não salta depois de uma pausa longa. Com quadros mais espaçados que isso, atrasa: o relógio não promete tempo real. |
| Testes de JavaScript usam resultados reais do núcleo, em `tests/fixtures/` | Um teste em Python falha se a fixture ficar diferente do núcleo. |
| Pilhas no lugar de muitos itens, com o total exato escrito | O custo do desenho não cresce com o número de pedidos, e nada é cortado em silêncio. |
| Estações na diagonal x + y = 12 do piso | Essa diagonal aparece reta na tela, o que evita rótulos sobre outros blocos em telas estreitas. |
| Clique testado contra o contorno do bloco, com alcance mínimo de 22 px | Inclui o topo desenhado e mantém o toque possível quando a cena encolhe. |
| Cancelar o pedido anterior e também conferir se a resposta é do pedido atual | O cancelamento pode chegar tarde, com a resposta já a caminho. |
| Lógica de JavaScript em funções testadas com `node --test` | Testa regras sem navegador e sem pacotes npm; o Node não é necessário para executar. |
| Cenário A como cópia independente, em memória no navegador, sem os eventos | Não exige banco de dados e pesa pouco; recarregar a página o descarta, com aviso na tela. |
| Resumo gerado no servidor, em módulo Python | Fica junto das regras e é testado com `pytest`. |
| Comparação só com diferenças absolutas, sem apontar um cenário melhor | O melhor depende do que a pessoa valoriza, e percentuais não existem quando a base é zero. |
| Exemplos guardam só parâmetros | O resultado passa pelo fluxo normal, sem cálculos paralelos que possam divergir. |
| RAI-007: seis áreas locais, identificadas por âncoras, com `hidden` nas inativas | Encurta cada tela, permite links diretos e histórico, sem framework, build ou recarga que descarte o formulário e o cenário A. |
| Navegação controla foco, título da página e `aria-current` | A área visível e a posição de teclado acompanham o destino, inclusive em detalhes recolhidos. |
| Botão Simular cenário recalcula e abre a visão geral; edição continua com atualização automática | Torna a ação principal explícita sem remover o retorno imediato dos controles existentes. Só a ação explícita troca a área. |
| Cena pausa ao sair de Restaurante | Não mantém reprodução invisível consumindo quadros; o Canvas continua montado e redimensiona ao voltar. |
| Indicadores do dashboard apenas formatam valores e diagnósticos da API | Não acrescenta regras financeiras, estimativas de lucro ou IA fictícia. |
| Playwright e axe opcionais em pasta ignorada | Verificação reproduzível em Chrome sem adicionar dependências de execução ao produto. |
