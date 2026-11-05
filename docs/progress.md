# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entregas 0 a 4:** integradas à `main` pelos PRs #1 a #5 (último merge `5cd5fa6`).
- **Entrega 5:** em revisão, na branch `feat/comparacao-cenarios`.
- **Entrega 6:** não iniciada.

| Onde | O que existe |
| --- | --- |
| `main` | Núcleo, API, interface, cena, reprodução, testes e documentos |
| `feat/comparacao-cenarios` | Tudo da `main`, mais resumo, comparação, ajuda e exemplos |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações; mantido separado do simulador |

### Versionado na entrega 5

- `src/simulador/resumo.py`, e `exemplos_para_interface` em `parametros.py`, com a rota `/api/exemplos`.
- `src/simulador/web/js/comparacao.js`, `comparacao-pagina.js` e `exemplos.js`.
- `tests/test_resumo.py` e `tests/js/comparacao.test.mjs`.
- Ajustes de linguagem e ajuda em `index.html`, `indicadores.js` e `estilos.css`.

Nada do simulador continua local e sem commit.

## Verificações executadas

Todas são **verificações técnicas, e não testes com usuários**.

**Clone limpo do commit `4366fda`, o último com código**, em pasta nova, no Windows, com Python 3.15.0
e Node 24. Commits posteriores alteram apenas documentação. Um arquivo não pode citar o próprio
commit, então o SHA final e o resultado do clone dele ficam na descrição do PR.

| Verificação | Resultado |
| --- | --- |
| Ambiente virtual novo, `pip install -r requirements.txt` e `pip check` | Sem erros |
| `pytest` | 175 aprovados |
| `node --test "tests/js/*.test.mjs"` | 97 aprovados |

**Navegador:** Chrome real, com o servidor desse clone. Sem erros no console e sem recursos externos.

| Etapa do fluxo | Resultado |
| --- | --- |
| Resumo inicial | "18 de 20 pedidos ficaram prontos", identificado como regras, sem IA |
| Guardar A e mudar o desconto para R$ 5 | Só o desconto listado; −R$ 4,25 por pedido e −R$ 76,50 no turno; conta conferida à mão |
| Carregar exemplos | Formulário substituído, reprodução no minuto 0 e A mantido |
| Limpar A | Comparação some, foco vai para o botão de guardar e os resultados continuam |

**Com os mesmos arquivos, em servidor da pasta de trabalho:**

| Situação | Resultado |
| --- | --- |
| Guardar durante entrada inválida ou cálculo | Botão bloqueado, com a explicação |
| Atual com entrada inválida | Aviso de que a coluna mostra o último cenário válido |
| Turno de 90 contra 60 min | Aviso de períodos diferentes, sem apontar cenário melhor |
| Zero pedidos contra A | Médias como "Não comparável", sem percentuais |
| Teclado | Guardar, aplicar exemplo e limpar A com Enter |
| 390 e 320 px, em `iframe` | Tabela vira blocos rotulados, sem estouro nem texto cortado |

## Limitações

- **Facilidade de uso não validada:** nenhuma pessoa usuária testou a aplicação. Termos, resumo e
  exemplos são hipóteses da revisão.
- **Pendentes para a entrega 6:** fluidez da reprodução em uso normal, troca real de aba e preferência
  real do sistema por menos movimento.
- **Não verificado:** aparelho real, toque, outros navegadores e leitor de tela.
- **Reprodução sem deslizamento:** os itens mudam de lugar no instante de cada evento. O relógio não
  promete precisão de tempo real em computadores lentos.
- **Cenário A:** fica só na memória da página, e recarregar o descarta, com aviso na tela.
- **Testes de JavaScript:** cobrem as regras da comparação. A aparência e `comparacao-pagina.js` foram
  conferidos só manualmente.
- **Ambiente:** clone limpo verificado apenas no Windows, com Python 3.15.0.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 6**, depois da revisão e do merge da entrega 5: revisão final, demonstração reproduzível e
teste de uso, em `docs/revisao-final`. O teste depende de pessoas reais; se não ocorrer, a ausência de
validação com usuários será declarada.
