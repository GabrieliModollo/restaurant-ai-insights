# Assistente de decisões

Na **Visão geral**, a pessoa escreve uma pergunta em português e recebe uma resposta calculada pelo
simulador a partir do **último cenário calculado**. A rota é `POST /api/assistente`, com
`{"pergunta": "...", "cenario": {parâmetros do simulador}}`.

## Fluxo

```text
pergunta ──► interpretação em JSON ──► validação ──► ferramenta do motor ──► resposta escrita pelo Python
             (Ollama opcional;          (esquema e     (analisar_promocao,    (só números calculados)
              regras como reserva)       números)       executar_simulacao,
                                                        consultar_regras)
```

| Intenção | Exemplo | Ferramenta | O que a resposta mostra |
| --- | --- | --- | --- |
| `promocao` | "Um desconto de R$ 5 se paga?", "10% de desconto com 25 pedidos?" | `analisar_promocao` | Meta de pedidos prontos, capacidade, diferença no turno e maior desconto que se paga |
| `equipe` | "E se eu colocar mais uma pessoa no preparo?" | `executar_simulacao` (antes e depois) | Pedidos prontos e valor que sobra, sem o custo da pessoa extra |
| `pedidos` | "Quantos pedidos ficam prontos se chegarem 30?" | `executar_simulacao` | Prontos, pendentes, fila e valor que sobra |
| `regras` | "Quem paga o desconto no iFood?" | `consultar_regras` | Resposta da base local, fontes com data e dados a confirmar no contrato |
| `fora_do_escopo` | "Qual o melhor sabor de pizza?" | Nenhuma | O que o assistente sabe responder, com exemplos |

Uma pergunta de desconto sem valor pede o valor. Valores fora dos limites do simulador recebem a
mensagem da validação, sem cálculo.

## Proteções

- **O modelo não escreve a resposta.** Ele devolve só a intenção e os valores citados, no esquema
  `Interpretacao` (campos extras são rejeitados). O texto e os indicadores são compostos no Python.
- **Nenhum número inventado.** Todo valor devolvido pelo modelo precisa estar escrito na pergunta,
  com algarismos ou por extenso até dez. A exceção é "uma pessoa" implícita em "contratar alguém".
- **Reserva por regras.** Sem `RAI_IA_LOCAL=1`, com Ollama indisponível, resposta fora do esquema ou
  número não citado, a interpretação por regras assume. A interface mostra qual caminho foi usado e por quê.
- **Mesmos limites e cálculos.** As hipóteses passam pela validação de `ParametrosSimulacao` e
  pelas mesmas funções da API e do MCP.

## Ativar a IA local

Siga [Explicação local e avaliação](explicacoes-ia.md#execução-opcional): mesmo modelo
(`qwen2.5:1.5b`) e mesma variável `RAI_IA_LOCAL=1`. O prompt é `assistente-v1`, com quatro exemplos.

## Limites

- Uma intenção por pergunta. Pedidos combinados, como desconto e mudança de preço juntos, usam só o
  que a interpretação reconhece; o texto "Simulei…" mostra o que foi considerado.
- A interpretação por regras usa palavras-chave e entende variações comuns, não qualquer frase.
- A interpretação com Ollama foi testada com respostas simuladas do modelo. A taxa de acerto com o
  modelo real ainda não foi medida.
