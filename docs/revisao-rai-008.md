# Revisão técnica da RAI-008 — PR #10

Data: 2026-11-06. [PR #10](https://github.com/GabrieliModollo/restaurant-ai-insights/pull/10).
Base conferida no GitHub: `main` em `b4922997753b4041ac9120c3dc1adf95bce57a70`.
Head conferido no GitHub e localmente: `0ad21bb1ef67897fcc74b5c34dc590e50ac9ef2a`.
Os ajustes desta revisão são exclusivamente documentais; o código executado permanece idêntico.

**Parecer: apto tecnicamente para merge.** Nenhum bloqueante ou problema importante de produto
identificado no escopo examinado. Não foi feito merge nem iniciada a RAI-009. A aprovação técnica
não equivale à autorização da pessoa responsável para integrar o PR.

## Arquivos analisados

Os 19 arquivos do diff completo `origin/main...HEAD` foram examinados, incluindo as duas imagens.

| Grupo | Arquivos |
| --- | --- |
| Produto e documentação | `README.md`, `docs/architecture.md`, `docs/backlog.md`, `docs/product.md`, `docs/progress.md`, `docs/promocoes.md` |
| Capturas inspecionadas | `docs/capturas/promocao-rai-008.png`, `docs/capturas/promocao-mobile-rai-008.png` |
| Servidor | `src/simulador/api.py`, `src/simulador/promocoes.py` |
| Interface | `src/simulador/web/index.html`, `src/simulador/web/promocoes.css`, `src/simulador/web/js/api.js`, `src/simulador/web/js/comparacao-pagina.js`, `src/simulador/web/js/promocoes-pagina.js`, `src/simulador/web/js/promocoes.js` |
| Testes novos | `tests/test_promocoes.py`, `tests/js/promocoes.test.mjs`, `tests/browser/promocoes.cjs` |

Também foram lidos os módulos financeiros, de parâmetros, simulação, operação, controle do A,
execução de requisições e integração principal, os testes da API e o roteiro de navegador da RAI-007.
Foram respeitadas as instruções de `CLAUDE.md`; nenhum `AGENTS.md` foi encontrado na busca local.

## Conferência das regras e critérios

- Equilíbrio: `n × u ≥ B`, n inteiro não negativo. Base positiva e margem positiva usam teto
  inteiro; margem zero/negativa não recupera base positiva. Base não positiva permite mínimo zero;
  com margem negativa, há máximo `piso(B/u)`. Não há divisão por zero ou decisão com `float`.
- Contribuição: financeiro existente reutilizado; taxa arredondada por pedido com `ROUND_HALF_UP`;
  total sobre conclusões. Contribuição negativa é preservada, sem ser chamada de lucro líquido.
- Percentuais: diferença sobre o valor absoluto da base, com `null` quando ela é zero. Essa
  convenção aparece na interface; `Fraction` é convertido somente para saída.
- Capacidade: a meta financeira é confrontada com conclusões simuladas no limite de 1.000
  recebimentos, preservando equipe, tempos e turno. Esse teto depende de chegadas uniformes,
  filas FIFO e tempos fixos; não é previsão de demanda ou meta de recebimentos.
- Exemplo padrão reconferido pelos testes: base R$ 283,50; desconto de R$ 5 gera R$ 11,50 por
  conclusão e R$ 207,00 no turno; mínimo 25 conclusões contra teto operacional de 22.
- Cenário A: cópia independente em memória; promoção constrói outro objeto de parâmetros.
  Edição, invalidação e remoção da base cancelam a análise e rejeitam respostas antigas.
  Comparação e simulação anteriores continuaram funcionando nos testes e no navegador.
- API: endpoint aditivo, mesmos modelos de parâmetros e envelope de erros. Testes dos endpoints
  anteriores passaram; nenhum contrato financeiro anterior foi modificado.
- UX: vazio, espera, validação com foco, falha e repetição, comparação expansível, teclado,
  temas e celular conferidos. Explicações distinguem pedidos recebidos de concluídos e contribuição
  de lucro. Capturas originais e novas capturas desktop/celular foram inspecionadas.

## Achados por gravidade

| Classe | Achado | Tratamento |
| --- | --- | --- |
| Bloqueante | Nenhum identificado | Sem correção de código de produção |
| Importante de produto | Nenhum identificado | Critérios conferidos dentro dos limites descritos |
| Melhoria documental | `docs/promocoes.md` descrevia a chegada do k-ésimo pedido como `k × turno/N`, sem esclarecer o índice; o código começa em zero | Corrigido para `(k − 1) × turno/N`, com k iniciando em 1. Não altera cálculo ou capacidade |
| Melhoria futura de UX | Para base não positiva, o indicador de adicionais ainda usa a expressão genérica “concluídos a mais”, mesmo quando o valor é zero | Não bloqueia: há explicação específica e alerta de contribuição negativa, incluindo máximo admissível. Avaliar linguagem em sessões com gestores |
| Limitação importante da validação | Reinstalação em ambiente novo bloqueada por acesso ao PyPI | Não apresentar o clone como ambiente com dependências reinstaladas; repetir instalação quando houver acesso |

## Execuções novas nesta revisão

Windows, Python 3.15.0, pytest 9.2.0 e Node 24.21.0. Nenhum resultado histórico foi contado
como execução desta revisão. O servidor foi iniciado por esta sessão em `127.0.0.1:8037`,
com mensagem de inicialização bem-sucedida; os roteiros apontaram explicitamente para essa porta.

| Verificação | Resultado observado |
| --- | --- |
| Python na pasta original: `.venv\Scripts\python.exe -m pytest` | 225 aprovados em 3,95 s; 1 aviso de permissão para gravar cache do pytest |
| Python no clone limpo: Python da pasta original com `-m pytest -p no:cacheprovider` | 225 aprovados em 6,35 s, sem avisos |
| JavaScript, arquivos explícitos, na pasta original | 104 aprovados, 0 falhas |
| JavaScript, arquivos explícitos, no clone limpo | 104 aprovados, 0 falhas |
| `.venv\Scripts\python.exe -m pip check` no ambiente existente | `No broken requirements found.` |
| `git diff --check origin/main...HEAD` antes dos ajustes documentais | Sem erros |
| `tests/browser/promocoes.cjs`, Chrome sem janela + axe | 24 combinações: seis larguras × dois temas × margens positiva/negativa; sem estouro horizontal ou violações detectadas |
| Fluxos de promoções | Validação/foco, volume, zero pedidos, margem zero, base negativa, comparação, erro/repetição, descarte após limpar A, edição de cenário e teclado aprovados; sem erros JavaScript detectados |
| `tests/browser/interface.cjs`, Chrome sem janela + axe | 72 combinações: seis áreas × seis larguras × dois temas; sem estouro horizontal ou violações detectadas |
| Fluxos anteriores | Simulação, campos preservados, guardar/substituir/limpar A, validação, zero pedidos, exemplos, gargalos, reprodução, histórico, links, recuperação e teclado aprovados |
| Auditoria matemática adicional, fora da suíte | 840.582 comparações diretas de `n × u ≥ B` com o intervalo devolvido: todas aprovadas |

As larguras foram 320, 390, 768, 1024, 1440 e 1920 px. Os dois roteiros de navegador terminaram
com código zero. Capturas novas ficaram em `tmp/rai-008-promocao-desktop.png` e
`tmp/rai-008-promocao-mobile.png`, sem substituir os artefatos do PR.

O clone local foi criado em `tmp/revisao-rai-008-20261106`, a partir do head acima, sem mudanças
de fonte durante os testes. Foi criado um ambiente virtual próprio, mas `pip install --no-index`
não encontrou distribuições e `pip install -r requirements.txt` falhou por bloqueio de socket
ao PyPI (`WinError 10013`). Os testes no clone usaram o executável e as dependências do ambiente
original, executando a fonte do clone. Isso verifica isolamento da fonte, mas não reinstalação.

Uma tentativa inicial de JavaScript com glob entre aspas neste executor coletou **zero testes**
e foi descartada como evidência. A execução com todos os 12 arquivos explícitos coletou e aprovou
104 testes. `node --test tests/js/*.test.mjs`, sem aspas no `cmd.exe`, também coletou 104.

### Comandos para repetir

Na raiz da fonte a verificar, com ambiente instalado e Chrome disponível:

```powershell
.\.venv\Scripts\python.exe -m pytest -p no:cacheprovider
.\.venv\Scripts\python.exe -m pip check
# Enumeração explícita evita uma execução silenciosa sem testes neste executor:
$arquivosTeste = @(Get-ChildItem tests/js/*.test.mjs | ForEach-Object FullName)
node --test @arquivosTeste
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --host 127.0.0.1 --port 8037
```

Em outro terminal, usando as ferramentas opcionais já descritas em `promocoes.md`:

```powershell
$env:NODE_PATH = "$PWD/.tmp-ui/node_modules"
$env:RAI_URL = "http://127.0.0.1:8037"
Remove-Item Env:RAI_SO_FLUXOS -ErrorAction SilentlyContinue
node tests/browser/promocoes.cjs
node tests/browser/interface.cjs
```

Auditoria matemática executada com o módulo do clone, em script temporário, equivalente a:

```python
from src.simulador.promocoes import calcular_equilibrio

for base in range(-100, 101):
    for margem in range(-20, 21):
        e = calcular_equilibrio(base, margem, 8)
        minimo = e["pedidos_concluidos_minimos"]
        maximo = e["pedidos_concluidos_maximos"]
        for n in range(102):
            dentro = minimo is not None and n >= minimo and (maximo is None or n <= maximo)
            assert dentro == (n * margem >= base)
```

## Riscos residuais e decisão

- Instalação independente das dependências não foi revalidada nesta revisão; `pip check` cobre
  apenas a consistência do ambiente existente.
- Axe, teclado e larguras emuladas não validam leitor de tela, aparelho físico, toque, zoom real
  ou outros navegadores. Não houve teste com pessoas reais.
- Permanecem as exclusões financeiras e operacionais explícitas do produto: não é ponto de
  equilíbrio completo da empresa, não estima vendas nem inclui todos os custos.
- `git fetch` na pasta original não pôde gravar `.git/FETCH_HEAD`; base e head foram conferidos
  diretamente pelo conector GitHub e coincidiram com os objetos locais examinados.

Não há falha observada que exija correção antes do merge no escopo da RAI-008. Manter o PR aberto
até a autorização de integração e tratar qualquer mudança posterior de código como sujeita a nova
verificação. Esta revisão não modifica a `main` nem a branch de pesquisa do PR #9.

## Registro e envio

A documentação foi preparada no clone `tmp/revisao-rai-008-20261106`, na própria branch
`feature/rai-008-analise-promocoes`, preservando a pasta original. O envio pelo conector GitHub foi
bloqueado ao criar a árvore: `MCP tool call requires approval, but approval policy is never`.
Nenhuma atualização de branch remota foi feita por esta revisão. O commit documental fica local
nesse clone para envio posterior; o parecer acima avalia o código que já está no PR.
