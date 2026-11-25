# Automação no n8n: resumo diário

O fluxo [`automacoes/n8n/resumo-diario.json`](../automacoes/n8n/resumo-diario.json) gera, todo dia às 23h
ou sob demanda, um resumo do turno em Markdown. Ele roda no **n8n instalado localmente** (gratuito,
sem n8n Cloud) e usa só a API do simulador: todos os números do resumo vêm do motor em Python.

## O que o fluxo faz

```text
Todo dia às 23h ─┐
                 ├─► Configuração ─► Baixar pedidos de referência (CSV)
Executar agora ──┘        │                    │
                          │                    ▼
                          │      Agregar pedidos no simulador  (POST /api/referencias/csv)
                          │                    │
                          │                    ▼
                          │      Ler parâmetros do simulador   (GET /api/campos)
                          │                    │
                          │                    ▼
                          │      Montar cenário do dia         (volume médio diário)
                          │                    │
                          │                    ▼
                          │      Perguntar: capacidade         (POST /api/assistente)
                          │      Perguntar: promoção           (POST /api/assistente)
                          │                    │
                          ▼                    ▼
                     pasta_saida ◄── Escrever resumo ─► Converter em arquivo ─► Salvar resumo
```

| Nó | Papel |
| --- | --- |
| Configuração | Endereço da API (padrão: a demo no Render), pasta de saída e desconto a testar |
| Montar cenário do dia | Parâmetros padrão do simulador com o volume médio diário da referência; não calcula resultados |
| Perguntar: capacidade e promoção | Usam o assistente de decisões, com a mesma interpretação e as mesmas proteções da interface |
| Escrever resumo | Junta as respostas em Markdown: referência, capacidade e promoção |

Um exemplo de saída está em [`docs/exemplo-resumo-n8n.md`](exemplo-resumo-n8n.md).

## Como executar

Requer Node.js 24. Na raiz do projeto, no PowerShell, instale o n8n uma vez numa pasta ignorada pelo
Git (cerca de 2.250 pacotes; nesta máquina levou 16 minutos):

```powershell
npm install --prefix tmp\n8n-app --no-audit --no-fund n8n@2.47.3
```

Depois, para importar e executar o fluxo:

```powershell
$n8n = "$PWD\tmp\n8n-app\node_modules\.bin\n8n.cmd"
$env:N8N_USER_FOLDER = "$PWD\tmp\n8n"
$env:N8N_RESTRICT_FILE_ACCESS_TO = "$PWD\automacoes\saida"
New-Item -ItemType Directory -Force automacoes\saida | Out-Null
& $n8n import:workflow --input=automacoes\n8n\resumo-diario.json
& $n8n execute --id=RAIResumoDiario1
```

O resumo aparece em `automacoes/saida/resumo-AAAA-MM-DD.md` (pasta ignorada pelo Git). Para ver e
editar o fluxo na interface, rode `& $n8n start` com as mesmas variáveis e abra <http://localhost:5678>.

- **Agendamento:** o fluxo é importado desativado. Ative-o na interface para rodar todo dia às 23h,
  com o n8n em execução.
- **API local:** troque `api` no nó Configuração por `http://127.0.0.1:8010` para usar o simulador local.
- **Demo hibernada:** a demo gratuita responde 503 nos primeiros segundos depois de hibernar. Cada
  chamada HTTP tenta de novo até 5 vezes, com 5 s de intervalo, e espera até 90 s pela resposta.

## Verificação

- `tests/test_automacao_n8n.py` confere, sem o n8n, que as conexões ligam nós existentes, que cada rota
  chamada existe na API, que o arquivo não guarda credenciais e que as chamadas tentam de novo.
- Em 25/11/2026, com n8n 2.47.3 nesta máquina, a primeira execução falhou com 503 porque a demo estava
  hibernando, o que motivou as novas tentativas. Depois disso, `execute` terminou com sucesso e gerou o
  [exemplo de resumo](exemplo-resumo-n8n.md). Os números conferem com o motor: 43 pedidos por turno,
  22 prontos, meta de 31 para o desconto de R$ 5 e diferença de −R$ 93,50.
- O agendamento diário não foi testado: o fluxo é importado desativado.
