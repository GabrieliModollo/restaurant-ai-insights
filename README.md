# Restaurant AI Insights

Simulador local para explorar como preço, desconto, custos, quantidade de pedidos e equipe afetam
um turno de restaurante. Foi pensado para quem gerencia um pequeno restaurante e tem pouca
familiaridade com software.

> Simulação ilustrativa com dados fictícios. **Não há modelo de IA integrado:** o projeto foi
> desenvolvido com assistência de IA, mas funciona só com regras e cálculos. Não usa serviços pagos,
> chaves de API nem recursos externos para executar.

![Dashboard com indicadores e acesso ao simulador](docs/capturas/dashboard-rai-007.png)

A interface está organizada em **Visão geral, Simulador, Cenários, Financeiro, Restaurante e Ajuda**.
Os indicadores principais aparecem no dashboard. Os detalhes ficam nas áreas correspondentes,
preservando os valores ao navegar. No celular, o guia inicial fica recolhido.

## Como funciona

1. **Ajuste o cenário em Simulador.** O formulário já vem preenchido, e há três exemplos fictícios. A quantidade de
   pedidos é uma hipótese sua: o simulador não a estima, e o desconto não a altera.
2. **Clique em Simular cenário para ver o dashboard.** O servidor simula as filas de preparo e embalagem e calcula os
   resultados. Um resumo em linguagem simples, gerado por regras, mostra quantos pedidos ficaram
   prontos e o valor que sobra após os custos por pedido.
3. **Compare em Cenários.** Guarde um cenário A, mude os valores no Simulador e veja as diferenças, sem que o simulador aponte
   um cenário melhor.
4. **Acompanhe os pedidos em Restaurante.** Um restaurante isométrico em Canvas reproduz os eventos do turno, com
   relógio, velocidade e etapas. As estações podem ser selecionadas por clique ou por teclado.

![Restaurante com reprodução e seleção de estação](docs/capturas/restaurante-rai-007.png)

## Como executar

Requer Python 3.15. No PowerShell, a partir da raiz do projeto:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --port 8010
```

Abra <http://127.0.0.1:8010>. Se a porta estiver ocupada, escolha outro número. Para recarregar o
servidor ao editar o código, acrescente `--reload`. O roteiro em
[`docs/demonstracao.md`](docs/demonstracao.md) mostra a aplicação em cerca de 5 minutos.

## Como testar

```powershell
.\.venv\Scripts\python.exe -m pytest
node --test "tests/js/*.test.mjs"
```

O segundo comando testa a lógica do JavaScript. Ele usa só o Node.js, sem pacotes npm, e não é
necessário para executar o simulador.

O roteiro opcional de navegador verifica as seis áreas, responsividade, axe e fluxos completos.
As instruções estão em [`docs/revisao-rai-007.md`](docs/revisao-rai-007.md).

## API

Com o servidor em execução:

- `GET /api/campos`: parâmetros, unidades, limites e valores iniciais.
- `GET /api/exemplos`: exemplos fictícios, com todos os parâmetros.
- `POST /api/simulacoes`: recebe os parâmetros e devolve `financeiro`, `operacao`, com os eventos do
  turno, e `resumo`. Valores monetários vêm em centavos inteiros.
- Entrada inválida recebe o código 422 e `{"erros": {"campo": "mensagem"}}`. Um corpo que não pode
  ser lido usa `corpo` como nome do campo.

```powershell
Invoke-RestMethod http://127.0.0.1:8010/api/campos
```

## Limitações

- **Facilidade de uso:** ainda não validada com usuários. O roteiro do teste está em
  [`docs/teste-de-uso.md`](docs/teste-de-uso.md).
- **Modelo:** um único produto, chegadas em intervalos iguais e tempos constantes, sem pausas,
  cancelamentos ou desistências.
- **Finanças:** o valor que sobra (margem de contribuição) não é lucro líquido. Impostos, salários,
  aluguel e desperdício ficam de fora, assim como os custos de pedidos ainda em processo no fim do
  turno.
- **Resultados:** descrevem este modelo. Não são previsão, recomendação nem benefício medido.
- **Cenário A:** fica só na memória da página, e recarregar o descarta.
- **Reprodução:** os itens mudam de lugar no instante de cada evento, sem deslizar.
- **Verificação:** feita no Windows, com Python 3.15 e Chrome. Os detalhes estão em
  [`docs/progress.md`](docs/progress.md).

## Organização

| Caminho | Função |
| --- | --- |
| `src/simulador/parametros.py` | Limites, valores iniciais, validação e exemplos |
| `src/simulador/operacao.py` | Filas, capacidade, diagnóstico e eventos |
| `src/simulador/financeiro.py` | Cálculos em centavos |
| `src/simulador/resumo.py` | Resumo do turno, gerado por regras |
| `src/simulador/simulacao.py` | Executa operação, finanças e resumo em sequência |
| `src/simulador/api.py` | Rotas e entrega da interface |
| `src/simulador/web/` | Interface em HTML, CSS e JavaScript puro |
| `tests/` | Testes em Python e, em `tests/js/`, em JavaScript |
| `docs/` | Produto, backlog, arquitetura, progresso, demonstração e teste de uso |

O módulo de análise de avaliações fica na branch `feature/analise-avaliacoes` e não faz parte do
simulador.
