# Progresso

Última atualização: 2026-11-05.

## RAI-008 — análise de promoções e ponto de equilíbrio

Branch `feature/rai-008-analise-promocoes`, a partir da `main` atualizada em `b492299`.
Implementação local: endpoint novo `POST /api/promocoes` e painel na área Cenários, reutilizando
A e cenário atual. Desconto/volume são hipóteses locais; nenhum contrato anterior mudou.
Regras e decisões: `docs/promocoes.md` e `docs/architecture.md`.

Na pasta de trabalho: **225 testes Python e 104 JavaScript aprovados**. Chrome instalado, sem janela:
seis larguras (320, 390, 768, 1024, 1440 e 1920), dois temas, margens promocionais positiva e negativa,
24 combinações sem estouro horizontal ou violações detectadas pelo axe, com detalhamento aberto.
Fluxos anteriores da RAI-007 e novos da promoção aprovados, incluindo base negativa, margem zero,
zero pedidos, descarte de resposta pendente ao limpar A, alteração de cenário, teclado, validação,
falha e repetição. Capturas inspecionadas; corrigida quebra vertical da legenda no celular.

Pendentes: commit, clone limpo, push e PR. Não há autorização de merge nesta entrega.
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

## Próxima tarefa

Depende de pessoas reais: conduzir as sessões de `docs/teste-de-uso.md`. Com as observações em mãos, o
Claude Code pode analisá-las e corrigir os problemas prioritários.

Decisões pendentes estão em `docs/backlog.md`.
