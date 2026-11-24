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
  número não citado, a interpretação por regras assume. Se a leitura do modelo ficar incompleta, os
  campos faltantes vêm das regras (valores lidos no próprio texto) ou as regras assumem. A interface mostra qual caminho foi usado e por quê.
- **Mesmos limites e cálculos.** As hipóteses passam pela validação de `ParametrosSimulacao` e
  pelas mesmas funções da API e do MCP.

## Avaliação

`python -m scripts.avaliar_assistente` mede só a interpretação (a resposta continua vindo do motor);
`--com-ia` consulta o Ollama. Há dois conjuntos de perguntas fictícias: **ajuste**, usado para corrigir o
prompt e a combinação com as regras, e **novos**, escrito depois desses ajustes e não usado para mudá-los.
Rodada de 24/11/2026, nesta máquina, com Ollama 0.40.18, `qwen2.5:1.5b` e prompt `assistente-v2`:

| Conjunto | Só regras | IA local com proteções | Respostas em que a IA foi usada |
| --- | --- | --- | --- |
| Ajuste (20) | 19 | 20 | 18 |
| Novos (13) | 10 | 10 | 7 |

- **Antes dos ajustes** (prompt `assistente-v1`), a IA acertou 13 de 20 no conjunto de ajuste: esquecia a
  estação nas perguntas de equipe e perdia o percentual. A versão 2 completa esses campos com o que as
  regras leram no texto e cede a vez às regras quando a leitura do modelo fica incompleta.
- **Números inventados bloqueados:** no conjunto novo, o modelo acrescentou 10% a "R$ 4 de desconto",
  trocou "1,50" por R$ 47,50 e 15%, e inventou "2 pessoas" em "Com 25 pedidos a cozinha aguenta?".
  Nos três casos a checagem recusou a resposta e as regras assumiram.
- **Erros que restam no conjunto novo:** "Preciso de mais gente na cozinha?" (nenhum dos dois entende
  "gente"), "Se vierem 60 pedidos, quantos atraso?" (o modelo classificou como regras comerciais) e
  "Abaixar 1,50 no preço" (sem "reais", as regras não reconhecem o valor).
- Com 13 perguntas novas, a IA ainda não supera as regras; ela amplia o vocabulário (por exemplo,
  "oito reais") e as proteções impedem que seus erros cheguem aos números. A primeira chamada inclui
  o carregamento do modelo (cerca de 16 s); as seguintes levaram de 1 a 5 s.

O CI executa a avaliação por regras; a avaliação com Ollama é local.

## Ativar a IA local

Siga [Explicação local e avaliação](explicacoes-ia.md#execução-opcional): mesmo modelo
(`qwen2.5:1.5b`) e mesma variável `RAI_IA_LOCAL=1`. O prompt é `assistente-v2`, com seis exemplos.

## Limites

- Uma intenção por pergunta. Pedidos combinados, como desconto e mudança de preço juntos, usam só o
  que a interpretação reconhece; o texto "Simulei…" mostra o que foi considerado.
- A interpretação por regras usa palavras-chave e entende variações comuns, não qualquer frase.
- A avaliação usa poucas perguntas fictícias escritas pela equipe do projeto, não perguntas de gestores reais.
