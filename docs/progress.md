# Progresso

Última atualização: 2026-11-04.

## Estado atual

**Entrega 0 em revisão.** Nenhuma funcionalidade do simulador está em `main` nem em outra branch
remota até aqui.

| Onde | O que existe |
| --- | --- |
| `main` | Estrutura inicial, README antigo, `src/analise_avaliacoes.py` vazio |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações, sem testes; não usado pelo simulador |
| `docs/project-coordination` | Tudo da `main`, mais `CLAUDE.md` e `docs/` |
| Pasta de trabalho, **sem commit** | Simulador em `src/simulador/`, três arquivos de teste, alterações em `README.md`, `requirements.txt` e `.gitignore` |

**Risco principal:** o simulador só existe neste computador. A próxima entrega resolve isso.

**Ao trocar de branch:** `src/analise_avaliacoes.py` aparece vazio fora da
`feature/analise-avaliacoes`. É o comportamento esperado do Git: o conteúdo segue nessa branch.

## Verificações executadas

Em 2026-11-04, no Windows, com Python 3.15.0, sobre a pasta de trabalho:

| Verificação | Resultado |
| --- | --- |
| `pytest`, suíte completa | 51 aprovados |
| `pytest` só em `test_financeiro.py` e `test_operacao.py` | 21 aprovados |
| `pip install -r requirements.txt --dry-run` e `pip check` | Sem erros nem dependências quebradas |
| Servidor iniciado na porta 8011, sem `--reload` | `GET /` e `GET /api/campos` responderam 200 |
| `POST /api/simulacoes` com o cenário padrão | 18 concluídos, contribuição de R$ 283,50, 96 eventos |
| `POST /api/simulacoes` com desconto acima do preço | 422 |

O comando com `--reload --port 8010` não foi iniciado nesta verificação. Uma instância aberta fora
dela já ocupava a porta com esse comando e foi mantida em execução.

## Limitações

- **Navegador:** nenhuma tela foi aberta nesta verificação. Formulário, indicadores e JavaScript
  não têm teste automatizado.
- **Clone limpo:** ainda não testado. A criação de um novo `.venv` também não foi repetida.
- **Lacunas na interface:** limites dos campos só aparecem em mensagens de erro; falta indicar "sem
  IA conectada" (ver `docs/backlog.md`).
- **Ainda não implementado:** Canvas, reprodução, comparação de cenários e explicações por regras.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 1**, depois da revisão e do merge da entrega 0: criar `feat/nucleo-simulacao` a partir da
`main` e versionar o núcleo, sem reimplementá-lo, completando os critérios de `docs/backlog.md`.
