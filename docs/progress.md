# Progresso

Última atualização: 2026-11-24.

## Demo online — AIB-05

O PR #45 (Hugging Face Spaces) foi integrado, mas a criação do Space retornou 402: Spaces Docker
passaram a exigir o plano PRO. Em revisão na branch `feat/demo-render`: a publicação passa para o
Render, plano gratuito, com `render.yaml` e Python 3.12.16. Os arquivos do Hugging Face foram removidos.
Verificação local: o comando de início com `PORT=10000` respondeu `/api/campos`, a página e o
assistente. **Pendente:** criar o serviço pelo Blueprint no Render e verificar a demo publicada.

## Avaliação de qualidade do assistente — AIB-04

Integrada à main no PR #43, branch `feature/avaliacao-assistente`.
45 casos versionados em três conjuntos (ajuste, novos e robustez), avaliados de ponta a ponta em
interpretação, ferramenta, fidelidade numérica e texto esperado. O portão roda no pytest e no CI.
Os testes encontraram cinco erros 500 com valores extremos, corrigidos nesta branch.

Verificação local: 375 testes Python (1 ignorado), incluindo 30 cenários aleatórios, e 107 JavaScript.
Com Ollama 0.40.18 e `qwen2.5:1.5b`: fidelidade 45/45; interpretação 20/20, 10/13 e 10/12 (regras:
19/20, 10/13 e 12/12). Detalhes em [Assistente](assistente.md#avaliação-de-qualidade).

## Assistente de decisões

Integrado à main no PR #42, branch `feature/assistente-decisoes`. Painel na Visão geral e rota `POST /api/assistente`:
a pergunta vira uma intenção em JSON (Ollama opcional ou regras), validada e executada pelo motor
existente. A resposta é escrita no Python, só com números calculados. Detalhes em [Assistente](assistente.md).

Verificação local: 341 testes Python (1 ignorado) e 107 JavaScript. Chrome, com servidor local, em
320, 390, 768 e 1280 px, temas claro e escuro: 8 combinações sem estouro horizontal nem violações do
axe no painel; fluxos de promoção, equipe, regras com fontes, fora do escopo, pergunta curta, cenário
editado (30 pedidos) e falha 500 aprovados. Com Ollama 0.40.18 e `qwen2.5:1.5b` instalados, a
avaliação da interpretação deu 20/20 no conjunto de ajuste e 10/13 no conjunto novo (regras sozinhas:
19/20 e 10/13). A checagem bloqueou três números inventados pelo modelo. Detalhes em [Assistente](assistente.md#avaliação-de-qualidade).

## README para o portfólio

Integrado à main no PR #41, branch `docs/readme-portfolio`. O topo do README resume para quem é o simulador, o que
ele faz e onde entra a IA, com um GIF de cerca de 1 MB (`docs/capturas/demonstracao.gif`). O GIF foi
gravado no Chrome a 1280 × 760 px com o servidor local: teste da promoção de exemplo (meta de 25,
capacidade de 22, −R$ 76,50) e reprodução do turno a 2×. Só documentação e imagem; nenhum código alterado.

## Demonstração e MCP local

Integrada à main no PR #38, branch `feature/demo-e-mcp`. O roteiro de cinco minutos vai da promoção
de exemplo à comparação de desconto e equipe, ao pico de pedidos e à exportação.
O servidor MCP local disponibiliza as ferramentas de promoção e alternativas via stdio,
com resultados estruturados e os mesmos modelos de validação da API.

Verificação local: 307 testes Python, incluindo o cliente MCP em subprocesso,
104 JavaScript e fluxos de promoção, referência e arquivo no Chromium. O roteiro
e a configuração do cliente estão em [Demonstração](demonstracao.md) e [MCP local](mcp.md).
A validação com gestores permanece pendente.

## Guardar e compartilhar cenários

Integrada à main no PR #37. A área Cenários baixa a hipótese, a
referência, a ficha calculada e as comparações concluídas em um JSON versionado. A
reabertura recalcula o resumo para consulta e preserva o cenário em edição. O resumo
é exportável em texto.

Verificação: 306 testes Python, 104 JavaScript e fluxo de download, reabertura e
exportação em Chromium a 320 px com axe. O README descreve as entregas recentes.

## Melhorias de arquitetura

Integradas à main no PR #36. O Ollama escolhe entre versões
escritas no servidor, e respostas fora do formato acionam o texto por regras.
A busca comercial exige que a pergunta indique um tema coberto. O GitHub Actions
executa Playwright e axe no painel de referência em 320 px.

Verificação local: 300 testes Python, 104 JavaScript, três casos com Ollama e o fluxo
do CSV no Chromium a 320 px.

## Importação de dados de referência

Integrada à main no PR #34. A área Cenários carrega um exemplo
sintético ou aceita um CSV local no mesmo formato. Mostra origem, período e quantidades
agregadas pela hora de criação, com concluídos e cancelados em colunas próprias. O arquivo
é processado pelo servidor do simulador sem armazenamento e não muda a hipótese da promoção.

Verificação: 289 testes Python e 104 JavaScript aprovados. No Chromium, o fluxo de
exemplo, erro e importação passou em 320 px, com teclado e verificação pelo axe.

## Simulação de pico de pedidos

Integrada à main no PR #33. A hipótese promocional compara pedidos chegando
ao longo de todo o turno ou concentrados no primeiro quarto, com a mesma equipe e os mesmos
tempos. Os cartões mostram a maior fila em cada estação, a espera média, os pedidos prontos
e os pendentes. A média usa apenas pedidos prontos no turno.

Verificação: 278 testes Python, 104 JavaScript e navegação das seis áreas no Chromium.
O fluxo de pico foi conferido em 320 px, com teclado e axe.

## Consulta de regras comerciais

Integrada à main no PR #32. A consulta acrescenta busca local em quatro guias oficiais e
respostas compostas por tema. A tela identifica quais campos ainda precisam ser confirmados
nos dois canais. As taxas e os valores seguem como entrada do simulador.

## Comparação de canais

Integrada à main no PR #31. A mesma hipótese pode ser comparada com custos comerciais
de dois canais. As taxas são informadas na tela, assim como o frete e a divisão do desconto.
O simulador preserva preço ao cliente, ficha técnica, volume, equipe e turno entre canais.

## Comparação entre desconto menor e reforço

Integrada à main no PR #30. As alternativas usam o mesmo volume e turno
da hipótese analisada. O reforço preserva o desconto e adiciona uma pessoa à estação escolhida.
O custo do reforço é informado para o turno e descontado no servidor em centavos inteiros.

## Fluxo de promoção e ficha técnica

A entrega P0 foi integrada à main no PR #29. O painel separa exemplo e dados
próprios, abre o resultado antes dos controles e sinaliza a análise anterior durante a edição.
O desconto, o volume e a equipe digitados ficam na sessão após mudanças no Simulador.
A ficha abre junto ao custo de ingredientes e permite preencher e editar um ingrediente fictício.
O menu Restaurante abre a cena da cozinha, com os controles de reprodução.

Verificação: 249 testes Python e 104 JavaScript aprovados. O Chromium confirmou o resumo completo
na primeira tela em 320 × 740 e 390 × 844, a preservação da hipótese e os fluxos de ficha e teclado.

## Explicação local e avaliação

A branch `feature/explicacao-local-e-validacao` adiciona explicação opcional com Ollama, referência
por regras, avaliação reproduzível, vídeo da demonstração, instruções Linux e testes no GitHub Actions.
Ela depende do PR #25. O radar de pesquisa está em [PR independente](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/26).

O teste local de Ollama gerou uma resposta para cada um dos três casos da avaliação. Os valores
exibidos foram preservados. A revisão dos textos indicou que a referência por regras continua
competitiva em clareza. Resultados e limites estão em [Explicação local e avaliação](explicacoes-ia.md).

## Demo de promoções, alternativas e RAI-009

A branch `feature/promocoes-e-ficha-tecnica` reúne três mudanças para revisão: exemplo de promoção
na tela inicial, desconto máximo por hipótese com ajuste local da equipe e ficha de ingredientes
por porção. A ficha envia o custo ao campo manual só por ação explícita. O PR #10, que entregou
a análise de promoções original, foi integrado à `main` em 07/11/2026.

Verificação em Linux com Python 3.12 e Node.js 24: **237 testes Python e 104 JavaScript aprovados**,
com `pip check` sem erros. Em Chromium sem janela, Playwright validou os fluxos antigos e novos.
As matrizes de 72 combinações para as seis áreas e 24 para promoções passaram na verificação de
largura e nas regras automatizadas do axe.

Próximo passo de aprendizado: avaliar se um modelo local explica corretamente as saídas de
`POST /api/promocoes` nos casos de limite operacional, contribuição negativa e turnos diferentes.

## Revisão técnica da RAI-008 — 2026-11-06

Diff completo do PR #10 revisado contra `main` em `b492299`; código examinado em `0ad21bb`.
Nenhum bloqueante ou problema importante de produto identificado. Corrigida apenas a fórmula
documental da chegada do k-ésimo pedido, que começa no minuto zero; código financeiro preservado.
Parecer técnico: apto para merge, que continua dependendo da autorização da pessoa responsável.

Novas execuções nesta revisão: **225 testes Python e 104 JavaScript aprovados**, também com
fonte em clone limpo e dependências do ambiente existente; `pip check` sem erros. Não houve
reinstalação bem-sucedida em ambiente novo: acesso ao PyPI bloqueado pelo ambiente (WinError 10013).
Chrome sem janela: 24 combinações de promoções e 72 das seis áreas da RAI-007, sem estouro ou
violações detectadas pelo axe; fluxos novos e anteriores aprovados. Auditoria matemática adicional:
840.582 comparações da desigualdade original, todas aprovadas.

Relatório, arquivos analisados, comandos e limites em [`revisao-rai-008.md`](revisao-rai-008.md).
Na data dessa revisão, o PR #10 aguardava merge e a RAI-009 ainda não havia começado.

## RAI-008 — análise de promoções e ponto de equilíbrio

Em revisão no [PR #10](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/10), branch
`feature/rai-008-analise-promocoes`, a partir da `main` atualizada em `b492299`.
Implementação no commit `d70c28c`: endpoint novo `POST /api/promocoes` e painel na área Cenários, reutilizando
A e cenário atual. Desconto/volume são hipóteses locais; nenhum contrato anterior mudou.
Regras e decisões: `docs/promocoes.md` e `docs/architecture.md`.

Pasta de trabalho e clone limpo de `d70c28c`, com ambiente virtual próprio e dependências reinstaladas:
**225 testes Python e 104 JavaScript aprovados**, `pip check` sem erros. Chrome instalado, sem janela:
seis larguras (320, 390, 768, 1024, 1440 e 1920), dois temas, margens promocionais positiva e negativa,
24 combinações sem estouro horizontal ou violações detectadas pelo axe, com detalhamento aberto.
Matriz e fluxos repetidos contra o servidor do clone limpo na porta 8021, usando a instalação
opcional de ferramentas de navegador da revisão local.
Fluxos anteriores da RAI-007 e novos da promoção aprovados, incluindo base negativa, margem zero,
zero pedidos, descarte de resposta pendente ao limpar A, alteração de cenário, teclado, validação,
falha e repetição. Capturas inspecionadas; corrigida quebra vertical da legenda no celular.

Implementação e documentação enviadas ao PR #10. Próximo passo: revisão pela pessoa responsável.
Não houve merge na `main`; não há autorização de merge nesta entrega.
Limitações: mesmos custos excluídos e modelo determinístico; sem previsão de demanda ou IA.
Leitor de tela, aparelho físico, toque, zoom real, outros navegadores e pessoas reais não foram verificados.

## RAI-007 — interface intuitiva

Integrada à `main` pelo PR #8, merge `0cd6855`, autorizado pela pessoa responsável.
README ampliado no commit `fdefd36`. Merge com autoria `GabrieliModollo`, sem coautoria.
As entregas 0 a 6 estão integradas (PR #7: `3a9ff71`). O histórico abaixo registra a revisão anterior do MVP.

Refatoração completa implementada no commit `685dc6f`, substituindo a primeira etapa visual anterior.
A referência PNG fornecida em Downloads foi inspecionada: composição semelhante, ilustrações próprias,
sem afirmar reprodução exata. Seis áreas substituem a tela única: Visão geral, Simulador, Cenários,
Financeiro, Restaurante e Ajuda. O dashboard prioriza contribuição, conclusão, tempo médio e gargalos;
o botão Simular cenário recalcula e abre a visão geral. Atualização automática e funcionalidades anteriores
preservadas. Detalhes secundários expansíveis; reprodução pausa ao sair da área Restaurante.

**Pasta de trabalho e clone limpo de `685dc6f`:** 176 testes Python e 97 JavaScript aprovados.
O clone tem ambiente virtual próprio, dependências reinstaladas e `pip check` sem erros.
Nenhuma alteração na API ou nos cálculos. `pytest.ini` impede coleta de clones temporários como testes do produto.

**Chrome instalado, sem janela:** seis áreas × seis larguras (320, 390, 768, 1024, 1440 e 1920 px) ×
dois temas, totalizando 72 combinações sem estouro horizontal ou violações detectadas pelo axe.
Grupos expansíveis abertos na matriz; guia recolhido no celular e seis destinos do menu visíveis.
Capturas de desktop, celular e restaurante inspecionadas e versionadas em `docs/capturas/`.

**Fluxos aprovados:** carregamento pendente, ação Simular cenário, preservação dos campos, guardar/
substituir/limpar A, diferenças de parâmetros e resultados, validação e foco no campo inválido,
contribuição negativa, zero pedidos, exemplos, gargalos, reprodução e pausa ao navegar, seleção,
histórico, link direto para seção recolhida, falhas inicial e posterior com recuperação, teclado,
âncora repetida e console sem erros JavaScript. Menos movimento emulado na matriz; reprodução
verificada também com movimento normal.
Os fluxos completos foram repetidos com sucesso contra o servidor do clone limpo, na porta 8019;
as ferramentas de navegador opcionais vieram da instalação local de revisão.

Roteiro e limitações em `docs/revisao-rai-007.md`. Leitor de tela, aparelho físico, toque, zoom real,
outros navegadores e pessoas reais permanecem pendentes. A verificação técnica não comprova
usabilidade com usuários. Próximo passo: conduzir as sessões de `docs/teste-de-uso.md` com pessoas reais.

## Histórico do MVP — estado em 2026-11-04

- **Entregas 0 a 5:** integradas à `main` pelos PRs #1 a #6 (último merge `6ecf8bf`).
- **Entrega 6:** em revisão, na branch `docs/revisao-final`. Encerra o MVP.

| Situação | Estado |
| --- | --- |
| Conclusão técnica do MVP | Concluída, sujeita à revisão do PR |
| Validação com usuários | **Pendente: usabilidade ainda não validada com usuários** |
| Publicação | Não realizada nem autorizada; a aplicação roda localmente |

A classificação de cada critério está em `docs/backlog.md`. Nada do simulador continua local e sem
commit. `feature/analise-avaliacoes` segue separada do simulador.

## Verificações executadas

Todas são **verificações técnicas, e não testes com usuários**.

**Clone limpo do commit `9195b4b`, o último com código**, em pasta nova, no Windows, com Python 3.15.0
e Node 24. Commits posteriores alteram apenas documentação e capturas. Um arquivo não pode citar o
próprio commit, então o SHA final e o resultado do clone dele ficam na descrição do PR.

| Verificação | Resultado |
| --- | --- |
| Roteiro do README: ambiente virtual novo, instalação e `pip check` | Sem erros |
| `pytest` | 176 aprovados |
| `node --test "tests/js/*.test.mjs"` | 97 aprovados |
| Servidor iniciado com `--reload` e sem ele | `GET /` com 200 |
| Busca por credenciais, arquivos temporários e recursos externos | Nada encontrado |
| Dependências de `requirements.txt` | Todas em uso |

**Navegador:** Chrome real, em tema escuro, com o servidor do clone limpo e sem erros no console.

| Fluxo | Resultado |
| --- | --- |
| Fluidez em execução normal | 60 quadros por segundo, 0,31 ms por quadro; 8 minutos do turno em 4 s, como esperado |
| Contribuição negativa | Resumo com o valor negativo e ponto de atenção de R$ 5,50 por pedido |
| Zero pedidos | Conclusão própria e "Sem pedidos concluídos" nas médias |
| Turnos diferentes | Aviso de períodos diferentes |
| Guardar, substituir e limpar A | Funcionam, com foco preservado |
| Teclado | Tab e botões funcionam; foco visível |
| Atalhos em 390, 320 e 640 px, em `iframe` | Levam ao restaurante, sem estouro |

**Defeito encontrado e corrigido:** no celular, o restaurante ficava a mais de 2.200 px do topo. Foram
acrescentados atalhos para as partes dos resultados, sem esconder conteúdo.

**Com simulação, e não em condição real:**

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Falha de `/api/campos` na primeira carga | `fetch` substituído em `iframe` | Mensagem e botão; recuperou ao repetir |
| Troca de aba | `document.hidden` substituído | Pausa e continua pausada |
| Menos movimento | `matchMedia` substituído | Só etapas, sem quadros |
| Tema claro | Regras do tema escuro removidas na página | Legível |
| Zoom | Larguras menores em `iframe`, como aproximação | Sem estouro |

## Limitações de ambiente

- **Troca real de aba:** a ferramenta de navegador captura outra aba sem colocá-la em primeiro plano,
  então a página continuou visível e o teste real não foi possível.
- **Preferência real por menos movimento e tema claro real:** dependem de configurações do sistema,
  que não foram alteradas.
- **Não verificado:** aparelho real, toque, zoom real, tela de alta densidade, outros navegadores,
  leitor de tela e sistemas além do Windows.
- **Fluidez:** medida nesta máquina, em números. A impressão visual de uma pessoa não foi avaliada, e
  com quadros mais espaçados que 1 s o relógio atrasa.

## Validação com usuários

Depende de pessoas reais: conduzir as sessões de `docs/teste-de-uso.md`. Com as observações em mãos, o
Claude Code pode analisá-las e corrigir os problemas prioritários.

Decisões pendentes estão em `docs/backlog.md`.
