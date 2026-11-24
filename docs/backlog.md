# Backlog

Status possíveis: **Pendente**, **Código local sem commit**, **Em revisão** e **Concluída**.
Uma entrega só é concluída depois do merge, feito pela pessoa responsável.

## Próximas entregas

| Ordem | Prioridade | Entrega | Critério de aceite |
| --- | --- | --- | --- |
| 1 | P0 | Fluxo de promoção em uma tela (em revisão) | Separar exemplo e cenário próprio. Mostrar meta de 25 pedidos, capacidade de 22 e perda de R$ 76,50 na demo, sem rolar em 320 e 390 px. Preservar as entradas ao editar, sinalizar quando recalcular e manter o foco perceptível pelo teclado. |
| 2 | P0 | Simplificar ficha técnica e navegação (em revisão) | Abrir a ficha junto ao custo de ingredientes, agrupar quantidade e unidade e oferecer exemplo editável. Abrir Restaurante pela visualização da cozinha, com reprodução acessível. Pode seguir no mesmo PR do item 1. |
| 3 | P1 | Comparar desconto menor e reforço de equipe | Mostrar lado a lado pedidos prontos, contribuição, custo adicional de equipe e resultado após esse custo. Destacar contribuição negativa e aviso de turnos com durações diferentes no resumo. |
| 4 | P1 | Comparar a promoção por canal | Usar a mesma ficha e o mesmo turno de referência. Permitir editar comissão, taxa de pagamento, frete, parcela do desconto paga pela loja e subsídio da plataforma. |
| 5 | P1 | RAG de regras comerciais, após o item 4 | Responder por que a mesma promoção deixa contribuições diferentes entre canais. Buscar localmente em um conjunto pequeno de guias oficiais e citar fonte e data. Distinguir regra geral de condição contratual, pedir os valores faltantes e delegar o cálculo ao motor Python. Avaliar casos com fontes claras, condições contratuais e dados ausentes. |
| 6 | P1 | Simular pico de pedidos | Comparar o mesmo volume, com a mesma equipe, chegando distribuído ou concentrado. Mostrar fila, espera e pedidos prontos. |
| 7 | P2 | Importar dados de referência | Começar com CSV sintético compatível com os campos documentados do iFood Analytics. Identificar a origem e distinguir pedido pronto de entrega concluída. A conexão autenticada depende do acesso oficial. |
| 8 | P2 | Guardar e compartilhar cenários | Reabrir ficha, referência e alternativas. Exportar um resumo com hipóteses, resultados e custos considerados. |
| 9 | P2 | Atualizar o roteiro da demonstração | Cobrir primeiro uso, edição e interpretação dos resultados com dados fictícios. A validação com gestores fica pendente até haver participantes. |
| 10 | P2 | MCP para assistente externo | Expor duas ferramentas de consulta, **simular promoção** e **comparar alternativas**, com entradas validadas e resultados estruturados. Reutilizar o motor existente e reproduzir os mesmos números em um cliente MCP compatível. |

## Histórico de entregas

| # | Entrega | Branch sugerida | Depende de | Status |
| --- | --- | --- | --- | --- |
| 0 | Documentação e coordenação | `docs/project-coordination` | Nenhuma | Concluída (PR #1) |
| 1 | Núcleo financeiro e simulação | `feat/nucleo-simulacao` | 0 | Concluída (PR #2) |
| 2 | API, parâmetros e indicadores | `feat/api-interface` | 1 | Concluída (PR #3) |
| 3 | Canvas isométrico e estações | `feat/canvas-isometrico` | 2 | Concluída (PR #4) |
| 4 | Reprodução dos eventos e primeiro uso | `feat/reproducao-eventos` | 3 | Concluída (PR #5) |
| 5 | Comparação e explicações | `feat/comparacao-cenarios` | 2 | Concluída (PR #6) |
| 6 | Revisão final e demonstração | `docs/revisao-final` | 3, 4 e 5 | Concluída (PR #7) |
| RAI-007 | Interface intuitiva | `feat/rai-007-interface-intuitiva` | 6 | Concluída (PR #8, merge `0cd6855`) |
| RAI-008 | Análise de promoções e ponto de equilíbrio | `feature/rai-008-analise-promocoes` | RAI-007 | Concluída (PR #10) |
| — | Exemplo de promoção, desconto máximo e ajuste de equipe | `feature/promocoes-e-ficha-tecnica` | RAI-008 | Concluída (PR #25) |
| RAI-009 | Ficha técnica de ingredientes por porção | `feature/promocoes-e-ficha-tecnica` | RAI-008 | Concluída (PR #25) |
| RAI-013 | Explicação de promoções e avaliação da IA local | `feature/explicacao-local-e-validacao` | PR #25 | Concluída (PR #27) |
| — | Radar de pesquisa consolidado | `docs/radar-consolidado` | Rascunhos de pesquisa | Concluída (PR #26) |

## Classificação final dos critérios

### RAI-008 — promoções

Revisão técnica independente em 2026-11-06: apto para merge, sem bloqueantes identificados.
Novas execuções e limitações em [`revisao-rai-008.md`](revisao-rai-008.md); os registros de clone
com dependências reinstaladas abaixo pertencem à validação anterior. Integrada pelo PR #10 em 07/11/2026.

- [x] Reutilizar financeiro, operação, validação e cenário A; preservar contratos anteriores.
- [x] Comparar preço, desconto, taxa, custos, contribuição unitária/total e diferenças.
- [x] Resolver equilíbrio com centavos inteiros, inclusive margens zero/negativas e base negativa.
- [x] Distinguir recebidos de concluídos; confrontar a meta com volume-limite e capacidade operacional.
- [x] Integrar hipóteses de desconto/volume à área Cenários, sem IA ou previsão de vendas.
- [x] Testes Python (225) e JavaScript (104) aprovados em clone limpo de `d70c28c`, com ambiente virtual próprio e `pip check` sem erros.
- [x] Chrome: seis larguras, dois temas e margens positiva/negativa, 24 combinações sem estouro ou violações detectadas pelo axe, com detalhes abertos.
- [x] Fluxos anteriores e novos, erros, recuperação, descarte de respostas antigas, teclado e foco conferidos no navegador.
- [x] Implementação commitada em `d70c28c` e validada em clone limpo.
- [x] PR #10 integrado na `main`.

### RAI-007 — refatoração completa

- [x] Inspecionar a referência PNG e a arquitetura; preservar API, cálculos e funcionalidades existentes.
- [x] Reorganizar a experiência em seis áreas, com dashboard, ação principal de simulação e navegação com estado preservado.
- [x] Priorizar contribuição, pedidos concluídos, tempo médio e gargalos; detalhes secundários expansíveis.
- [x] Formulário agrupado, estados de carregamento/erro/comparação vazia e animação integrada ao Restaurante.
- [x] Executar testes Python (176) e JavaScript (97), todos aprovados também em clone limpo de `685dc6f`, com ambiente virtual próprio e `pip check` sem erros.
- [x] Chrome sem janela: seis áreas, dois temas e seis larguras entre 320 e 1920 px; 72 combinações sem estouro ou violações detectadas pelo axe.
- [x] Exercitar fluxos de simulação/comparação, valores extremos, reprodução, erros e recuperação, teclado, foco, histórico e links diretos.
- [x] Inspecionar e versionar capturas do dashboard, celular e restaurante.
- [x] Registrar roteiro reproduzível em `docs/revisao-rai-007.md`.
- [x] PR revisado e integrado com autorização da pessoa responsável (merge `0cd6855`).

Leitor de tela, aparelho físico e validação com usuários permanecem pendentes.

Conferida contra o código na revisão final. Os detalhes de cada verificação estão em
`docs/progress.md`.

| Classificação | Itens |
| --- | --- |
| **Verificado** | Núcleo, regras financeiras e filas; API e erros; formulário e limites; indicadores; cena, seleção e agrupamento; reprodução e totais finais; resumo, comparação, ajuda e exemplos; instalação em clone limpo; teclado no Chrome; fluidez medida em números nesta máquina; tema escuro |
| **Implementado, mas não verificado em condição real** | Troca real de aba; preferência real por menos movimento; tema claro real; falha real de `/api/campos`; zoom real; toque e aparelho celular real; tela de alta densidade; outros navegadores; leitor de tela |
| **Pendente** | Teste de uso com pessoas reais |

## Mudança em relação ao plano original

As entregas 1 e 2 já têm código e testes na pasta de trabalho. Elas passam a **revisar, completar
e versionar** esse código, em vez de reimplementá-lo. A divisão separa as regras sem HTTP (1) da
API e interface (2), porque `api.py` exige a pasta `web/` para iniciar e isso deixa cada PR menor.

## Critérios de aceitação

`[x]` significa que o item existe e foi conferido por teste automatizado ou leitura do código. A
verificação em navegador é um critério à parte e só é marcada quando realmente executada.

### 0. Documentação e coordenação

- [x] `CLAUDE.md` e os quatro documentos refletem o que foi encontrado no repositório.
- [x] O simulador local não é alterado nem incluído no commit.
- [x] PR revisado e integrado pela pessoa responsável.

### 1. Núcleo financeiro e simulação

Arquivos: `parametros.py`, `financeiro.py`, `operacao.py`, `simulacao.py`, `__init__.py`, os testes
desses módulos, `requirements.txt` e `.gitignore`.

- [x] Testes de zero pedidos, contribuição negativa e arredondamento monetário.
- [x] Testes de filas, múltiplos funcionários e conclusão exatamente no fim do turno.
- [x] Teste de desconto negativo ou maior que o preço, sem depender de HTTP.
- [x] Teste de coerência: totais reconstruídos dos eventos coincidem com os da simulação.
- [x] Receita e contribuição contam só pedidos concluídos, com teste sem HTTP.
- [x] Testes passam em um clone limpo da branch, sem API, interface ou dependências HTTP.
- [x] PR revisado e integrado.

### 2. API, parâmetros e indicadores

Arquivos: `api.py`, `web/`, `tests/test_api.py`, `tests/js/`, `README.md` e as dependências `fastapi`,
`uvicorn` e `httpx2` em `requirements.txt`.

- [x] API devolve finanças, operação e eventos, e rejeita parâmetros inválidos com erro por campo.
- [x] `api.py` usa `executar_simulacao`, em vez de repetir a sequência de cálculos.
- [x] Corpo ilegível recebe erro compreensível, e erro inesperado não expõe detalhes internos.
- [x] Testes de `test_api.py` cobrem o contrato HTTP, sem repetir `test_parametros.py`.
- [x] Indicadores de conclusão, filas, espera, receita e contribuição são calculados no servidor.
- [x] Média ausente aparece como "Sem pedidos concluídos", e não como zero.
- [x] Aviso "sem IA conectada" e explicação de contribuição, custos excluídos e demanda informada.
- [x] Cada controle mostra seus limites antes de ocorrer um erro.
- [x] Resposta antiga não sobrescreve o cenário mais recente; espera, falha de conexão e erro do
  servidor têm mensagens próprias.
- [x] Interface utilizável por teclado e sem estouro em 1920, 390 e 320 px de largura.
- [x] Interface verificada em navegador, com o resultado registrado.
- [x] Testes passam em um clone limpo da branch.
- [x] PR revisado e integrado.

### 3. Canvas isométrico e estações

- [x] Canvas nativo desenha piso, preparo, embalagem, retirada, pessoas e filas.
- [x] A cena avisa que representa o fim do turno, com os valores recebidos do servidor.
- [x] Quantidades grandes são agrupadas, com os totais exatos escritos.
- [x] Clicar em uma estação mostra os dados dela no resultado atual, com destaque visual.
- [x] Botões HTML selecionam as estações por teclado; os dados continuam fora do Canvas.
- [x] Seleção e gargalo aparecem também em texto, sem depender só de cor.
- [x] Geometria, modelo, detecção de clique, desenho e página em módulos separados.
- [x] A detecção de clique, a escala e o agrupamento têm testes automatizados.
- [x] O Canvas acompanha o painel e a densidade de pixels, sem repetição contínua.
- [x] Em espera, entrada inválida ou falha, a cena indica que é o último cenário válido.
- [x] Verificada no navegador em desktop, 390 e 320 px de largura.
- [x] Testes passam em um clone limpo da branch.
- [x] PR revisado e integrado.

### 4. Reprodução dos eventos e primeiro uso

Reprodução:

- [x] Iniciar, pausar, reiniciar, velocidade e relógio, sem início automático.
- [x] O estado de cada instante é derivado apenas dos eventos recebidos do servidor.
- [x] Teste: ao terminar, os totais reconstruídos coincidem com os da API.
- [x] Alterar parâmetros para a reprodução anterior e volta ao início.
- [x] A cena mostra o momento do relógio; os indicadores são identificados como do turno completo.
- [x] A estação selecionada separa o momento dos dados do turno completo.
- [x] O ciclo de quadros só existe durante a reprodução; ao voltar de outra aba, fica pausado.
- [x] Com menos movimento pedido pelo sistema, o acompanhamento é por etapas.

Primeiro uso (orientação para quem tem pouca familiaridade com software):

- [x] Orientação curta antes do formulário; cenário inicial utilizável sem preencher nada.
- [x] Parâmetros agrupados, com equipe e tempos recolhíveis e custos sempre visíveis.
- [x] "Atend." e "prontos" trocados por textos claros; legenda dividida em itens curtos.
- [x] Navegação explícita no celular entre "Ajustar cenário" e "Ver resultados", sem perder valores.
- [x] Verificado no navegador em desktop, 390 e 320 px de largura, e por teclado.
- [x] Testes passam em um clone limpo da branch.
- [x] PR revisado e integrado.

### 5. Comparação e explicações

- [x] Guardar o cenário A e comparar parâmetros e indicadores com o cenário atual.
- [x] Teste: mudar o cenário atual não altera o cenário A.
- [x] Teste: não é possível guardar durante espera, erro ou entrada inválida.
- [x] Diferenças absolutas, em centavos; médias ausentes como não comparáveis; sem cenário vencedor.
- [x] Turnos de durações diferentes são destacados; substituir e limpar A são ações explícitas.
- [x] Resumo em linguagem simples, gerado por regras no servidor, com teste dos casos-limite.
- [x] As explicações por regras são identificadas como sem IA conectada.
- [x] Nenhum texto atribui ao desconto um aumento de demanda.
- [x] Ajuda contextual para os termos, sem renomear contribuição como lucro.
- [x] Três exemplos fictícios, pelo fluxo normal, com teste do que cada um anuncia.
- [x] Fluxo verificado no navegador, em desktop, 390 e 320 px, e por teclado.
- [x] Testes passam em um clone limpo da branch.
- [x] PR revisado e integrado.

### 6. Revisão final e demonstração

Revisão técnica:

- [x] Roteiro de demonstração reproduzível, em `docs/demonstracao.md`.
- [x] README revisado, sem declarar como pronto o que não está.
- [x] Revisão de escopo, restrições e critérios desta lista, com a classificação acima.
- [x] Fluidez medida nesta máquina.
- [x] Busca por credenciais, arquivos temporários, recursos externos e dependências sem uso.
- [x] Ausência de validação com usuários declarada no README e em `docs/progress.md`.
- [x] PR revisado e integrado (PR #7).

Limitações de ambiente, sem bloquear a revisão técnica:

- [ ] Troca real de aba e preferência real do sistema por menos movimento.

Validação com pessoas reais, que depende da pessoa responsável:

- [x] Roteiro pronto, em `docs/teste-de-uso.md`.
- [ ] Sessões realizadas com pessoas reais, sem participantes ou resultados inventados.
- [ ] Problemas prioritários analisados e corrigidos.

## Decisões pendentes da pessoa responsável

1. **Descrição do repositório no GitHub:** ainda diz "AI-powered restaurant review analysis using
   Python and Machine Learning", o que não descreve o simulador sem IA. Alterá-la?
2. **Arquivos vazios na `main`:** `src/analise_avaliacoes.py` e `tests/test_analise_avaliacoes.py`
   vêm da estrutura inicial e têm relação com `feature/analise-avaliacoes`. Não foram removidos.
   Mantê-los ou removê-los?

## Decisões tomadas

- **Branch `feature/analise-avaliacoes`:** permanece separada do simulador.
