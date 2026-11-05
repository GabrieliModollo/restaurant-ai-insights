# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entrega 0:** integrada à `main` pelo PR #1 (merge `f9e9d24`).
- **Entrega 1:** em revisão, na branch `feat/nucleo-simulacao`.
- **Demais entregas:** não iniciadas nesta etapa. API e interface existem apenas localmente.

| Onde | O que existe |
| --- | --- |
| `main` | Estrutura inicial, README antigo, `CLAUDE.md` e `docs/` |
| `feat/nucleo-simulacao` | Tudo da `main`, mais o núcleo do simulador e seus testes |
| `feature/analise-avaliacoes` | Módulo de resumo de avaliações; mantido separado do simulador |

### Versionado na entrega 1

- `src/simulador/`: `__init__.py`, `parametros.py`, `financeiro.py`, `operacao.py`, `simulacao.py`.
- `tests/`: `test_parametros.py`, `test_financeiro.py`, `test_operacao.py`, `test_simulacao.py`.
- `requirements.txt`, apenas com `pydantic` e `pytest`, e `.gitignore`.

### Continua local e sem commit

**Risco:** estes arquivos só existem neste computador, além da cópia de segurança em
`restaurant-ai-insights-backups`, na Área de Trabalho, conferida por hash.

- `src/simulador/api.py` e `src/simulador/web/` (HTML, CSS e quatro módulos JavaScript).
- `tests/test_api.py`.
- `README.md`, com a documentação do simulador completo.
- `requirements.txt` local, diferente do commitado: inclui `fastapi`, `uvicorn` e `httpx2`.

### Ao trocar de branch

Antes do merge da entrega 1, em outra branch, os arquivos do núcleo somem da pasta de trabalho, e a
API local deixa de iniciar até voltar a `feat/nucleo-simulacao`. Nada se perde: eles estão no
commit. `src/analise_avaliacoes.py` aparece vazio fora de `feature/analise-avaliacoes`.

## Verificações executadas

**Clone limpo do commit `1373ad4`**, em pasta nova, no Windows, com Python 3.15.0. Só arquivos
commitados, sem copiar nada da pasta de trabalho:

| Verificação | Resultado |
| --- | --- |
| Ambiente virtual novo e `pip install -r requirements.txt` | Sem erros |
| `pip check` | Sem dependências quebradas |
| `api.py`, `web/` e `test_api.py` no clone | Ausentes |
| `fastapi`, `starlette`, `uvicorn`, `httpx` e `httpx2` no ambiente | Não instalados |
| `pytest` | 101 aprovados |
| Cenário padrão via `executar_simulacao`, sem HTTP (no commit `0c203c4`; só testes mudaram depois) | 18 concluídos, contribuição de R$ 283,50, 96 eventos |

**Defeitos injetados de propósito**, em cópia descartável do mesmo commit: 16 de 16 detectados pelos
testes. A primeira rodada detectou 14 e revelou duas lacunas, cobertas com novos testes. A lista é
uma amostra das regras principais, não uma medida exaustiva.

**Só na pasta de trabalho**, sem valer para a branch: `pytest` com `test_api.py` local teve 131
aprovados.

## Limitações

- **Clone desta branch não inicia servidor nem interface:** isso depende da entrega 2.
- **README na branch:** ainda é o antigo e não descreve o simulador. A atualização é da entrega 2.
- **Navegador:** a interface local não foi aberta. JavaScript não tem teste automatizado.
- **Ambiente:** clone limpo verificado apenas no Windows e no Python 3.15.0.
- **Chamadas diretas:** `simular_operacao` e `calcular_financeiro` não validam entradas. A validação
  fica em `ParametrosSimulacao`, e `executar_simulacao` exige esse tipo.
- **Ainda não implementado:** Canvas, reprodução, comparação de cenários e explicações por regras.
- **GitHub CLI:** o comando `gh` não está instalado.

## Próxima tarefa

**Entrega 2**, depois da revisão e do merge da entrega 1: criar `feat/api-interface` a partir da
`main` e versionar API e interface, cumprindo os critérios de `docs/backlog.md`.
