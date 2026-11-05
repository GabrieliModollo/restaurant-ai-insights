# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entregas 0 a 3:** integradas à `main` pelos PRs #1 a #4 (último merge `91dc038`).
- **Entrega 4:** em revisão, na branch `feat/reproducao-eventos`.
- **Entregas 5 e 6:** não iniciadas.

| Onde | O que existe |
| --- | --- |
| `main` | Núcleo, API, formulário, indicadores, cena isométrica, testes e documentos |
| `feat/reproducao-eventos` | Tudo da `main`, mais a reprodução e as melhorias de primeiro uso |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações; mantido separado do simulador |

### Versionado na entrega 4

- `src/simulador/web/js/cena/linha-do-tempo.js`, `cena/reproducao.js` e `navegacao.js`.
- `tests/js/cena-linha-do-tempo.test.mjs`, `cena-reproducao.test.mjs` e `tests/fixtures/simulacoes.json`.
- Ajustes em `cena/modelo.js`, `cena/pagina.js`, `cena/desenho.js`, `formulario.js`, `principal.js`,
  `index.html`, `estilos.css` e nos nomes dos grupos em `parametros.py`.

Nada do simulador continua local e sem commit.

## Verificações executadas

Todas são **verificações técnicas, e não testes com usuários**.

**Clone limpo do commit `a8c95e0`, o último com código**, em pasta nova, no Windows, com Python 3.15.0
e Node 24. Commits posteriores alteram apenas documentação. Um arquivo não pode citar o próprio
commit, então o SHA final e o resultado do clone dele ficam na descrição do PR.

| Verificação | Resultado |
| --- | --- |
| Ambiente virtual novo, `pip install -r requirements.txt` e `pip check` | Sem erros |
| `pytest` | 147 aprovados |
| `node --test "tests/js/*.test.mjs"` | 83 aprovados |

**Navegador:** Chrome real, com o servidor do clone limpo no commit `cc0dc52`; depois dele, só mudou
o singular de "1 de 1 pessoa". Sem erros no console.

| Situação | Resultado |
| --- | --- |
| Abrir a página | Relógio no minuto 0, sem início automático e sem nenhum quadro agendado |
| Mover o controle de tempo até o minuto 30 | Cena e dados da estação daquele momento; financeiro do turno completo não muda |
| Reproduzir até o fim em 4× | 71 + 4 + 17 + 1 + 27 = 120, igual à API; nenhum quadro depois do fim |
| Gargalo | Aparece só no fim do turno |

**Com o servidor da pasta de trabalho, com os mesmos arquivos**, sem erros no console:

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Pausar | Tecla de espaço | Relógio parado e nenhum quadro durante a pausa |
| Velocidade | 4 s em 1× e em 4× | 6 e 24 minutos |
| Etapas | Botões de próxima e anterior | Avança e volta entre instantes com eventos |
| Cenário novo durante a reprodução | Parâmetro alterado | Para e volta ao minuto 0, mantendo a seleção |
| Estação selecionada | Minuto 9 | Separa o momento dos dados do turno completo |
| Outra aba | `document.hidden` substituído na página | Pausa e continua pausada ao voltar |
| Menos movimento | `matchMedia` substituído em `iframe` | Sem iniciar nem velocidade; etapas funcionam; sem quadros |
| Erro em grupo recolhido | Campo de tempo vazio | O grupo abre e mostra o erro |
| Larguras de 390 e 320 px | `iframe`, não um aparelho real | Sem estouro nem elementos fixos; navegação por clique real |
| Alternar entre cenário e resultados | Valor alterado antes de alternar | Valor mantido; alterar um campo não rola a página |

## Limitações

- **Facilidade de uso não validada:** nenhuma pessoa usuária testou a aplicação. As melhorias de
  primeiro uso são hipóteses de uma revisão. O teste real está previsto na entrega 6.
- **Fluidez não avaliada:** no navegador usado, os quadros chegaram a cerca de 1 ou 2 por segundo.
  O relógio manteve o ritmo, mas a suavidade em uso normal não foi observada.
- **Sem deslizamento:** os itens mudam de lugar no instante de cada evento, sem percorrer o caminho.
- **Não verificado:** aparelho celular real, toque, outros navegadores, leitor de tela e uma troca
  real de aba. Menos movimento foi testado com `matchMedia` substituído, e não pelo sistema.
- **Testes de JavaScript:** cobrem linha do tempo, relógio, modelo, geometria e clique. A aparência,
  `pagina.js` e `navegacao.js` foram conferidos só manualmente.
- **Ambiente:** clone limpo verificado apenas no Windows, com Python 3.15.0.
- **Ainda não implementado:** comparação de cenários, explicações por regras, resumo em linguagem
  simples, ajuda contextual e exemplos.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 5**, depois da revisão e do merge da entrega 4: comparação de cenários e explicações, em
`feat/comparacao-cenarios`, conforme `docs/backlog.md`.
