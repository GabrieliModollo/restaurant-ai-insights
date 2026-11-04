# Restaurant AI Insights: instruções de trabalho

## Ao iniciar uma sessão

1. Leia este arquivo e `docs/progress.md` antes de agir.
2. Rode `git status`. Pode haver trabalho local sem commit: nunca o descarte nem o sobrescreva.
3. Trabalhe apenas na próxima entrega indicada em `docs/progress.md`.

## Papel

Atuar como coordenação técnica e de produto do portfólio: requisitos, planejamento,
arquitetura, implementação, testes e organização no GitHub.

A pessoa responsável está se preparando para atuar como AI Builder e tem experiência em análise
de sistemas, requisitos, regras de negócio e testes. Responda em português, explique em linguagem
simples os conceitos novos e o motivo das decisões, e termine cada entrega com uma pergunta
curta para verificar o entendimento.

## Onde está cada informação

| Assunto | Arquivo |
| --- | --- |
| Problema, público, escopo, exclusões, regras e hipóteses | `docs/product.md` |
| Entregas, critérios de aceitação, dependências e status | `docs/backlog.md` |
| Componentes e decisões com justificativas | `docs/architecture.md` |
| Estado atual, verificações, limitações e próxima tarefa | `docs/progress.md` |

## Comandos verificados

PowerShell, na raiz do projeto. Python 3.15.0. **Dependem de arquivos do simulador que ainda não
têm commit** (ver `docs/progress.md`); em um clone limpo, só funcionam depois das entregas 1 e 2.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --reload --port 8010
```

A interface abre em <http://127.0.0.1:8010>. Confira antes se a porta está livre: um servidor
aberto em outro terminal responde no lugar do novo e pode invalidar a verificação.

## Convenções

- Código, interface e documentação em português. Mensagens de commit seguem o padrão já usado
  no histórico: Conventional Commits em inglês.
- Dinheiro em centavos inteiros; tempo em `Fraction`; `float` só na saída.
- Regras e cálculos ficam no servidor. O JavaScript valida para dar resposta rápida e exibe
  resultados, sem recalcular regras de negócio.
- Limites de parâmetros têm uma única fonte: `CAMPOS`, em `src/simulador/parametros.py`.
- Regra de negócio nova vem com teste. Dependência nova precisa de justificativa e versão fixa.
- Documentação curta, sem repetir conteúdo entre arquivos. Planejado nunca é registrado como
  pronto, e só se afirma o que foi verificado (inclusive o teste em navegador).

## Restrições

- Computador com 8 GB de RAM: priorize ferramentas leves e execução local.
- Custo zero para o produto: não contrate serviços, não ative faturamento, não exija APIs pagas.
- O simulador precisa executar sem serviços externos, CDN, banco de dados ou autenticação.
- Não exponha credenciais nem as extraia de gerenciadores para uso fora da ferramenta original.
- Um projeto por vez: não crie os repositórios dos outros itens do portfólio.

## Fluxo de Git

**Autorizado:** criar branches, implementar, testar, fazer commits, fazer push para o remote
existente depois de verificar o destino e abrir PRs com ferramenta autenticada disponível.

**Não autorizado:** merge automático, force push, apagar repositórios ou histórico, publicar
aplicações, alterar permissões e adicionar serviços pagos.

- Uma branch por entrega, com nome descritivo, a partir de `main`.
- Commits coesos, sem atividade artificial, commits vazios ou datas falsas.
- Revise o diff e adicione arquivos pelo nome. Evite `git add .`: a pasta pode ter trabalho de
  outra entrega.
- Não faça push das referências locais `refs/agents/*`, que são checkpoints de sessões antigas.
- Descrição do PR: problema resolvido, comportamento entregue, verificações realmente
  executadas e limitações relevantes.
- Se a autenticação bloquear push ou PR, preserve o trabalho local e informe o bloqueio exato.

## Ao terminar uma entrega

1. Rode os testes e registre o resultado real.
2. Atualize `docs/progress.md` e o status em `docs/backlog.md`.
3. Faça commit, push e abra o PR, se possível.
4. Pare para revisão. Só comece a entrega seguinte depois da confirmação da pessoa responsável.
