# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entrega 0:** integrada à `main` pelo PR #1 (merge `f9e9d24`).
- **Entrega 1:** integrada à `main` pelo PR #2 (merge `14fa0be`).
- **Entrega 2:** em revisão, na branch `feat/api-interface`.
- **Demais entregas:** não iniciadas.

| Onde | O que existe |
| --- | --- |
| `main` | Núcleo do simulador, testes, `CLAUDE.md`, `docs/` e README antigo |
| `feat/api-interface` | Tudo da `main`, mais API, interface, testes HTTP e JavaScript, e README novo |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações; mantido separado do simulador |

### Versionado na entrega 2

- `src/simulador/api.py` e `src/simulador/web/`.
- `tests/test_api.py` e `tests/js/`.
- `README.md` e `requirements.txt`, agora com `fastapi`, `uvicorn` e `httpx2`.

### Continua local e sem commit

Nada do simulador. A cópia de segurança anterior à entrega fica em `restaurant-ai-insights-backups`,
na Área de Trabalho, conferida por hash.

## Verificações executadas

**Clone limpo do commit `adc3178`, o último com código**, em pasta nova, no Windows, com Python
3.15.0 e Node 24. Só arquivos commitados, sem copiar nada da pasta de trabalho. Commits posteriores
alteram apenas documentação. Um arquivo não pode citar o próprio commit, então o SHA final e o
resultado do clone dele ficam na descrição do PR.

| Verificação | Resultado |
| --- | --- |
| Ambiente virtual novo, `pip install -r requirements.txt` e `pip check` | Sem erros |
| `pytest` | 137 aprovados |
| `node --test "tests/js/*.test.mjs"` | 21 aprovados |

**Servidor do clone limpo**, sem `--reload`, em porta própria e no commit `150b0b4` (depois dele só
mudou o foco do botão de repetir):

| Verificação | Resultado |
| --- | --- |
| `GET /` e `GET /api/campos` | 200 |
| `POST /api/simulacoes` com o cenário padrão | 18 concluídos, contribuição de R$ 283,50, 96 eventos |
| `POST` com desconto acima do preço e com JSON quebrado | 422 |
| `GET /docs` | 404 |

**Navegador:** Chrome real, com o servidor do clone limpo, entre os commits `8804f23` e `adc3178`;
nesse intervalo só mudaram o estilo do painel e o foco do botão de repetir, ambos reverificados. Sem
erros no console e sem recursos externos carregados.

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Tela de desktop | Janela de 1920 px | Sem rolagem horizontal |
| Largura de celular | `iframe` de 390 e 320 px, não um aparelho real | Sem estouro depois de corrigir o painel em 320 px |
| Zero pedidos | Digitação | "Sem pedidos concluídos" nas duas médias |
| Desconto acima do preço | Digitação | Mensagem no campo e indicadores marcados como antigos |
| Slider e botão de repetir | Só teclado | Funcionam; o foco é mantido ao repetir |
| Resposta antiga chegando depois da nova | `fetch` alterado na página | A tela manteve o cenário mais recente |
| Erro 500 e demora | `fetch` alterado na página, com os 10 s reais | Mensagem própria e botão de repetir |
| Servidor parado | Processo encerrado de verdade | Mensagem de conexão; recuperou pelo botão ao voltar |

## Limitações

- **Não verificado:** aparelho celular real, outros navegadores, leitor de tela e falha na primeira
  carga dos campos dentro do navegador.
- **Testes de JavaScript:** cobrem a lógica sem desenhar a tela. A ligação com a página foi conferida
  só manualmente, na lista acima.
- **Ambiente:** clone limpo verificado apenas no Windows, com Python 3.15.0.
- **Ainda não implementado:** Canvas, reprodução, comparação de cenários e explicações por regras.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 3**, depois da revisão e do merge da entrega 2: Canvas isométrico e estações clicáveis, em
`feat/canvas-isometrico`, conforme `docs/backlog.md`.
