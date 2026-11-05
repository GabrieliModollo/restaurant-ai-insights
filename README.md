# Restaurant AI Insights

Simulador local para explorar como preço, desconto, custos, quantidade de pedidos e equipe afetam
um turno de restaurante.

> Simulação ilustrativa com dados fictícios. **Não há modelo de IA conectado.** O simulador não usa
> serviços pagos, chaves de API nem recursos externos para executar.

## O que funciona hoje

- Formulário com parâmetros, unidades e limites visíveis.
- Simulação de filas de preparo e embalagem, calculada no servidor.
- Indicadores de conclusão, filas, espera, receita e contribuição.
- Restaurante isométrico em Canvas, com estações selecionáveis por clique ou por teclado.
- Reprodução do turno a partir dos eventos, com iniciar, pausar, velocidade, relógio e etapas.
- Orientação inicial e, no celular, navegação entre ajustar o cenário e ver os resultados.
- Explicação das fórmulas, dos custos excluídos e das hipóteses do modelo.

## Como executar

Requer Python 3.15. No PowerShell, a partir da raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --reload --port 8010
```

Abra <http://127.0.0.1:8010>. Se a porta estiver ocupada, escolha outro número.

## Como testar

```powershell
.\.venv\Scripts\python.exe -m pytest
node --test "tests/js/*.test.mjs"
```

O segundo comando testa a lógica do JavaScript. Ele usa só o Node.js, sem pacotes npm, e não é
necessário para executar o simulador.

## API

Com o servidor em execução:

- `GET /api/campos`: parâmetros, unidades, limites e valores iniciais.
- `POST /api/simulacoes`: recebe os parâmetros e devolve `financeiro` e `operacao`, com os eventos
  do turno. Valores monetários vêm em centavos inteiros.
- Entrada inválida recebe o código 422 e `{"erros": {"campo": "mensagem"}}`. Um corpo que não pode
  ser lido usa `corpo` como nome do campo.

```powershell
Invoke-RestMethod http://127.0.0.1:8010/api/campos
```

## Limitações

- **Modelo:** um único produto, chegadas em intervalos iguais e tempos constantes, sem pausas,
  cancelamentos ou desistências.
- **Demanda:** a quantidade de pedidos é uma hipótese informada por você, e o desconto não a altera.
- **Finanças:** contribuição não é lucro líquido. Impostos, salários, aluguel e desperdício ficam de
  fora, assim como os custos de pedidos ainda em processo no fim do turno.
- **Resultados:** descrevem este modelo e não são previsão de resultado real.
- **Facilidade de uso:** ainda não foi validada com pessoas que gerenciam restaurantes.
- **Ainda não implementado:** comparação de cenários, explicações por regras, resumo em linguagem
  simples e exemplos prontos.

## Organização

| Caminho | Função |
| --- | --- |
| `src/simulador/parametros.py` | Limites, valores iniciais e validação |
| `src/simulador/operacao.py` | Filas, capacidade, diagnóstico e eventos |
| `src/simulador/financeiro.py` | Cálculos em centavos |
| `src/simulador/simulacao.py` | Executa operação e finanças em sequência |
| `src/simulador/api.py` | Rotas e entrega da interface |
| `src/simulador/web/` | Interface em HTML, CSS e JavaScript puro |
| `tests/` | Testes em Python e, em `tests/js/`, em JavaScript |
| `docs/` | Produto, backlog, arquitetura e progresso |

O módulo de análise de avaliações fica na branch `feature/analise-avaliacoes` e não faz parte do
simulador.
