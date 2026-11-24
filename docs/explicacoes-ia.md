# Explicação local e avaliação

O botão **Explicar este resultado** aparece em Cenários após a análise de uma promoção. A opção
padrão usa a referência por regras. Quando ativado, um modelo local pode reescrever a causa em
linguagem simples. O Python continua compondo todos os valores exibidos. O texto enviado ao modelo
é a causa calculada, sem os valores do cenário. O resultado identifica a origem da explicação.

O servidor volta às regras se Ollama estiver indisponível, se o formato falhar ou se a explicação
gerada trouxer números, termos financeiros indevidos ou deixar de destacar a causa esperada nos
três casos avaliados. A checagem do texto é heurística. A revisão semântica continua necessária.

## Execução opcional

Instale [Ollama](https://ollama.com/download) e baixe o
[Qwen2.5 1.5B](https://ollama.com/library/qwen2.5:1.5b), com cerca de 986 MB no disco.
Mantenha Ollama em `127.0.0.1:11434`. Para desativar funções de nuvem no processo Ollama, defina
`OLLAMA_NO_CLOUD=1` antes de iniciar esse processo. Em uma instalação que já inicia Ollama
automaticamente, reinicie o processo com essa configuração. A aplicação usa apenas o modelo local
`qwen2.5:1.5b`, sem credenciais ou dependência Python adicional.

```bash
ollama pull qwen2.5:1.5b
RAI_IA_LOCAL=1 .venv/bin/python -m uvicorn src.simulador.api:app --port 8010
```

No PowerShell, com Ollama em execução:

```powershell
ollama pull qwen2.5:1.5b
$env:RAI_IA_LOCAL = '1'
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --port 8010
```

## Reproduzir a avaliação

Execute na raiz com o Python do ambiente virtual. O primeiro comando é o mesmo executado
no GitHub Actions. O segundo requer Ollama em execução e o modelo instalado.

```bash
python -m scripts.avaliar_explicacoes
python -m scripts.avaliar_explicacoes --com-ia
```

O relatório JSON mostra a explicação por regras, a candidata, sua origem, os fatos ausentes
e o tempo de resposta. Com `--com-ia`, cair nas regras marca a comparação como falha de geração,
mesmo se o texto das regras estiver correto.

| Caso | Valores esperados | Pergunta para a revisão do texto |
| --- | --- | --- |
| Capacidade insuficiente | 20 recebidos, 18 concluídos, meta 25, capacidade 22 | O resultado explica que concluir 25 excede a capacidade de 22? |
| Contribuição negativa | 20 recebidos, 18 concluídos, −R$ 5,50 por pedido | Fica claro que cada pedido concluído reduz a contribuição total? |
| Turnos diferentes | 28 recebidos, 27 concluídos, 60 e 120 minutos | O texto explica que os totais cobrem períodos diferentes, sem atribuir a diferença ao desconto? |

Dê um ponto por números corretos, um por explicar a relação da última coluna e um por clareza
sem promessas ou conceitos indevidos. Compare os pontos e anote se a frase do modelo acrescenta
clareza em relação às regras. Os três exemplos constituem uma avaliação exploratória com dados
fictícios. A taxa de acerto para outros cenários permanece desconhecida.

## Evolução observada

Na primeira tentativa, o modelo recebeu um texto com marcadores para números e frequentemente
omitiu os marcadores ou inventou percentuais. Ao separar os dados calculados da frase gerada, a
checagem automática de números passou, mas a revisão manual pegou uma conclusão que atribuía ao
desconto uma diferença entre turnos. A versão atual usa um aviso fixo para a diferença de períodos,
restringe o texto gerado a uma causa qualitativa e aplica critérios de aceitação por caso.

Na rodada final, com **Ollama 0.40.18**, **Qwen2.5 1.5B** e **promocoes-v8**, o modelo respondeu
nos **três casos** e a checagem automática preservou os valores. A primeira chamada incluiu o
carregamento do modelo. Os tempos são desta máquina.

| Caso | Tempo | Comparação com as regras |
| --- | --- | --- |
| Capacidade insuficiente | 4,51 s | Explicou a diferença entre meta e capacidade. A frase por regras ficou mais direta. |
| Contribuição negativa | 0,72 s | Reproduziu a mesma explicação por regras. |
| Turnos diferentes | 0,55 s | Mencionou durações diferentes. A formulação por regras distingue com mais precisão os totais dos períodos que eles cobrem. |

A rodada demonstrou integração local e preservação dos fatos exibidos. As respostas da IA não
mostraram ganho consistente de clareza neste conjunto pequeno, então as regras seguem como padrão.
