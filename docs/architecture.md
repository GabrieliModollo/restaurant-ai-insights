# Arquitetura

## Visão geral

```text
Navegador (HTML, CSS, JS puro, Canvas)
    │  GET /api/campos       limites e valores iniciais
    │  POST /api/simulacoes  parâmetros → financeiro + operação + eventos
    ▼
FastAPI / Uvicorn, na mesma origem
    ├─ parametros.py   valida
    ├─ operacao.py     simula filas e gera eventos
    └─ financeiro.py   calcula sobre os pedidos concluídos
```

## Componentes

*Existente* significa que o código está na pasta de trabalho, ainda **sem commit**; veja
`docs/progress.md`.

| Componente | Responsabilidade | Situação |
| --- | --- | --- |
| `src/simulador/parametros.py` | Limites, valores iniciais e validação | Existente |
| `src/simulador/financeiro.py` | Cálculos em centavos | Existente |
| `src/simulador/operacao.py` | Filas, capacidade, diagnóstico e eventos | Existente |
| `src/simulador/api.py` | Rotas e entrega da interface | Existente |
| `src/simulador/web/js/api.js` | Comunicação HTTP | Existente |
| `src/simulador/web/js/formulario.js` | Controles e validação imediata | Existente |
| `src/simulador/web/js/indicadores.js` | Exibição dos resultados | Existente |
| `src/simulador/web/js/principal.js` | Liga formulário, API e indicadores | Existente |
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
| Uvicorn sem extras e versões fixas em `requirements.txt` | Instalação leve e reproduzível. |
| `httpx2` só para testes | O `TestClient` da versão instalada do Starlette o utiliza. |

## Decisões propostas

Serão confirmadas na entrega correspondente.

| Proposta | Justificativa |
| --- | --- |
| Canvas API nativa, sem biblioteca | Requisito do projeto; leve para 8 GB de RAM. |
| Lógica pura de JavaScript (geometria, reprodução, comparação) separada do desenho e testada com `node --test` | Testa regras sem navegador e sem instalar pacotes npm. Node v24 já está instalado. |
| Cenário A como cópia imutável, em memória no navegador | Não exige banco de dados; recarregar a página o descarta. |
| Explicações geradas no servidor, em módulo Python | Ficam junto das regras e são testadas com `pytest`. |
