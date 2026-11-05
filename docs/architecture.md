# Arquitetura

## Visão geral

```text
Navegador (HTML, CSS, JS puro, Canvas)
    │  GET /api/campos       limites e valores iniciais
    │  POST /api/simulacoes  parâmetros → financeiro + operação + eventos
    ▼
FastAPI / Uvicorn, na mesma origem
    │
    ▼
Núcleo, sem dependência de HTTP
    ├─ parametros.py   valida
    └─ simulacao.py    executa, nesta ordem:
         ├─ operacao.py     simula filas e gera eventos
         └─ financeiro.py   calcula sobre os pedidos concluídos
```

## Componentes

*Núcleo* está na entrega 1. *Local* significa que o código está na pasta de trabalho, ainda
**sem commit**; veja `docs/progress.md`.

| Componente | Responsabilidade | Situação |
| --- | --- | --- |
| `src/simulador/parametros.py` | Limites, valores iniciais e validação | Núcleo |
| `src/simulador/financeiro.py` | Cálculos em centavos | Núcleo |
| `src/simulador/operacao.py` | Filas, capacidade, diagnóstico e eventos | Núcleo |
| `src/simulador/simulacao.py` | Executa operação e finanças em sequência | Núcleo |
| `src/simulador/api.py` | Rotas e entrega da interface | Local |
| `src/simulador/web/js/api.js` | Comunicação HTTP | Local |
| `src/simulador/web/js/formulario.js` | Controles e validação imediata | Local |
| `src/simulador/web/js/indicadores.js` | Exibição dos resultados | Local |
| `src/simulador/web/js/principal.js` | Liga formulário, API e indicadores | Local |
| Cena isométrica | Desenho e clique nas estações | Planejado |
| Reprodução | Relógio e estado derivado dos eventos | Planejado |
| Cenários | Guarda o cenário A e compara com o atual | Planejado |
| Explicações | Textos gerados por regras | Planejado |

## Decisões em vigor

| Decisão | Justificativa |
| --- | --- |
| Dinheiro em centavos inteiros | Evita erros de `float`, como 0,1 + 0,2 ≠ 0,3. |
| Taxa arredondada por pedido, meio centavo para cima (`ROUND_HALF_UP`) | Regra documentada e previsível; o total sempre fecha com valor por pedido × pedidos. |
| Tempo em `Fraction` | Permite decidir sem erro de arredondamento se um pedido terminou exatamente no fim do turno. |
| Pedido que termina exatamente no fim do turno é concluído | Regra explícita para o caso-limite. |
| Eventos calculados no servidor | A animação mostra o que foi simulado, em vez de criar uma segunda versão das regras. |
| `CAMPOS` como fonte única dos limites | Servidor e formulário não divergem. |
| Validação no navegador e no servidor | O navegador responde rápido; a decisão final é do servidor. |
| Interface e API na mesma origem, sem CDN nem etapa de build | Execução local simples, sem CORS e sem depender de internet. |
| "Gargalo observado" exige fluxo de entrada acima do ritmo **e** fila no fim do turno | Fila passageira ou pedido em andamento não provam sobrecarga. |
| "Menor capacidade" é um indicador separado de gargalo | Uma estação pode ser a mais lenta sem nunca formar fila. |
| Versões fixas em `requirements.txt`, só com o necessário a cada entrega | Instalação leve e reproduzível; o clone limpo prova que o núcleo não depende de HTTP. |
| Validação concentrada em `ParametrosSimulacao`; os cálculos confiam nela | Evita repetir regras. `executar_simulacao` exige esse tipo para deixar o contrato explícito. |
| Casas decimais conferidas com `quantize` e comparação exata | `normalize()` arredonda aos 28 dígitos do contexto padrão e deixaria passar valores inválidos. |
| Eventos no mesmo instante: fim, depois chegada, depois início | A pessoa termina um pedido antes de começar o próximo. Isso sustentará a reprodução. |

## Decisões propostas

Serão confirmadas na entrega correspondente.

| Proposta | Justificativa |
| --- | --- |
| Uvicorn sem extras | Requisito do projeto; instalação leve. |
| `httpx2` só para testes | O `TestClient` da versão local do Starlette o utiliza. |
| Canvas API nativa, sem biblioteca | Requisito do projeto; leve para 8 GB de RAM. |
| Lógica pura de JavaScript (geometria, reprodução, comparação) separada do desenho e testada com `node --test` | Testa regras sem navegador e sem instalar pacotes npm. Node v24 já está instalado. |
| Cenário A como cópia imutável, em memória no navegador | Não exige banco de dados; recarregar a página o descarta. |
| Explicações geradas no servidor, em módulo Python | Ficam junto das regras e são testadas com `pytest`. |
