# Como construí com IA

Este projeto foi construído de 2 a 24 de novembro de 2026, em 23 pull requests integrados, com agentes de IA
fazendo boa parte da implementação. Meu papel foi definir o problema, as regras de negócio e os
critérios de aceitação, além de revisar cada entrega antes do merge. Dentro do produto, a IA só
aparece onde a resposta dela pode ser conferida: os números vêm sempre do motor em Python.

## Divisão de papéis

| Quem | O que fez | Evidência no repositório |
| --- | --- | --- |
| Eu | Problema, público, regras financeiras, critérios de aceitação, revisão e merge | [`product.md`](product.md), [`backlog.md`](backlog.md) e os merges dos PRs |
| ChatGPT | Coordenação: planejar as entregas e integrar os PRs | Divisão de papéis em [`CLAUDE.md`](../CLAUDE.md) |
| Claude Code | Implementação, testes, verificação no navegador, commits e PRs | `CLAUDE.md` e 31 commits com `Co-Authored-By: Claude` |

## Como orientei os agentes

- **Um contrato de trabalho por escrito.** O [`CLAUDE.md`](../CLAUDE.md) é lido no início de cada
  sessão. Ele define por onde começar, o que nunca apagar, uma branch por entrega, o que o agente
  pode fazer sozinho (commit, push, PR) e o que depende de mim (merge, publicação, custos).
- **Critério de aceitação antes do código.** Cada entrega do [backlog](backlog.md) tem critérios
  verificáveis, por exemplo "mostrar meta de 25 pedidos e capacidade de 22 sem rolar em 320 px".
- **Só vale o que foi verificado.** O agente registra o que rodou de verdade (testes, clone limpo,
  navegador) e separa o que foi implementado do que foi conferido. O GitHub Actions repete os
  testes Python e JavaScript, Playwright e axe em cada PR.
- **Restrições explícitas.** Custo zero, execução local e um computador com 8 GB de RAM.
  Por isso a IA do produto usa um modelo pequeno no Ollama, e não uma API paga.

## Três vezes em que a revisão mudou a solução

1. **O modelo inventava números.** Na primeira versão da explicação, o Qwen2.5 1.5B recebia um texto
   com marcadores para os números e às vezes os omitia ou inventava percentuais. A solução foi
   separar os dados da frase: o Python compõe todos os valores e o modelo só escolhe a versão mais
   clara. Ainda assim, minha revisão manual pegou uma frase que atribuía ao desconto uma diferença
   que vinha de turnos com durações diferentes. A versão 8 do prompt acrescentou um aviso fixo para
   esse caso. Detalhes em [Avaliação da IA local](explicacoes-ia.md).
2. **A IA podia contradizer o cálculo.** Uma resposta do modelo podia negar que faltava capacidade
   ou que a contribuição era negativa. Agora o servidor confere a resposta contra o diagnóstico do
   motor e, se houver contradição, mostra a explicação por regras. Há testes com respostas que
   invertem a conclusão (PR #36).
3. **A busca respondia o que não sabia.** Uma pergunta fora do escopo, como a taxa para anunciar um
   produto, recebia fontes sem relação com ela. A consulta passou a exigir um tema coberto e a dizer
   quando a base não cobre o assunto (PR #36).

## Onde a IA está no produto

| Recurso | O que a IA faz | Proteção |
| --- | --- | --- |
| Explicar este resultado | O Ollama local escolhe entre duas frases escritas no servidor | Sem Ollama, resposta inválida ou contradição: texto por regras |
| Consulta de regras comerciais | Busca local por tema em quatro guias oficiais do iFood e da 99Food, citando fonte e data | Pede os valores contratuais em vez de supor; o cálculo fica no motor |
| [Servidor MCP](mcp.md) | Assistentes externos chamam `simular_promocao` e `comparar_alternativas` | Mesmos modelos de validação da API; o assistente recebe resultados estruturados |

A IA não calcula resultados, não recomenda preços e não prevê demanda ([`product.md`](product.md)).

## Limites

- A avaliação da explicação com Ollama cobre três casos fictícios. É exploratória: a taxa de acerto
  em outros cenários não é conhecida.
- A busca de regras comerciais usa palavras-chave, sem embeddings, e uma base de quatro guias.
- A facilidade de uso ainda não foi testada com gestores reais.
