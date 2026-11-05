# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entregas 0, 1 e 2:** integradas à `main` pelos PRs #1, #2 e #3 (último merge `a37ed35`).
- **Entrega 3:** em revisão, na branch `feat/canvas-isometrico`.
- **Demais entregas:** não iniciadas.

| Onde | O que existe |
| --- | --- |
| `main` | Núcleo, API, formulário, indicadores, testes e documentos |
| `feat/canvas-isometrico` | Tudo da `main`, mais a cena isométrica e seus testes |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações; mantido separado do simulador |

### Versionado na entrega 3

- `src/simulador/web/js/cena/`: `geometria.js`, `modelo.js`, `deteccao.js`, `desenho.js` e `pagina.js`.
- `tests/js/`: um arquivo de teste para cada módulo, exceto `pagina.js`.
- Ajustes em `index.html`, `estilos.css`, `principal.js`, `indicadores.js`, `api.py` e `operacao.py`,
  que agora devolve `duracao_turno_min`.

Nada do simulador continua local e sem commit.

## Verificações executadas

**Clone limpo do commit `00862cb`, o último com código**, em pasta nova, no Windows, com Python
3.15.0 e Node 24. Só arquivos commitados. Commits posteriores alteram apenas documentação. Um arquivo
não pode citar o próprio commit, então o SHA final e o resultado do clone dele ficam na descrição do
PR.

| Verificação | Resultado |
| --- | --- |
| Ambiente virtual novo, `pip install -r requirements.txt` e `pip check` | Sem erros |
| `pytest` | 142 aprovados |
| `node --test "tests/js/*.test.mjs"` | 51 aprovados |

**Navegador:** Chrome real, com o servidor desse clone. Sem erros no console e sem recursos externos.

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Cena inicial | Janela de 1920 px | Coerente com o servidor: 18 prontos, 1/2 e 1/1 em atendimento |
| Seleção por clique | Clique real no Canvas | Destaque, botão marcado e dados da estação |
| Seleção por teclado | Tab e espaço nos botões | Troca de estação e dados atualizados |
| Mudança de parâmetros | 1.000 pedidos, 50 pessoas | Totais iguais aos da API: 699 + 50 + 200 + 3 + 48 = 1.000; seleção mantida |
| Quantidades grandes | Mesmo cenário | Pilhas e grupo de pessoas, com os totais exatos escritos |
| Larguras de 390 e 320 px | `iframe`, não um aparelho real | Sem estouro nem sobreposição; clique funciona nas duas |
| Espera e falha | Durante o cálculo e com erro 500 simulado | Aviso de último cenário válido, depois recuperação |

**Com os mesmos arquivos, em servidor da pasta de trabalho:**

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Clique fora das estações | Clique real | Limpa a seleção |
| Entrada inválida | Desconto acima do preço | Cena apagada, com os dois avisos legíveis |
| Zero pedidos | Parâmetro alterado | Cena vazia, equipe presente e "0 prontos" |
| Tema claro | Regras do tema escuro removidas na página | Cena legível |
| Densidade de pixels 2 | `devicePixelRatio` substituído na página | Quadro interno dobrado, tamanho visual mantido |
| Redimensionamento | `iframe` de 320 para 600 px | Redesenho correto e seleção mantida |

## Limitações

- **Não verificado:** aparelho celular real, tela de alta densidade real, outros navegadores e leitor
  de tela. Toque foi testado apenas como clique de mouse.
- **Rótulos:** o teste de sobreposição estima a largura do texto. A largura real foi conferida só
  visualmente, nos casos acima.
- **Testes de JavaScript:** cobrem geometria, modelo, clique e os textos desenhados com um contexto
  falso. A aparência e `pagina.js` foram conferidos só manualmente.
- **Ambiente:** clone limpo verificado apenas no Windows, com Python 3.15.0.
- **A cena é estática:** mostra apenas o fim do turno. Reprodução, comparação de cenários e explicações
  por regras ainda não foram implementadas.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 4**, depois da revisão e do merge da entrega 3: reprodução dos eventos, em
`feat/reproducao-eventos`, conforme `docs/backlog.md`.
