# Backlog

Status possíveis: **Pendente**, **Código local sem commit**, **Em revisão** e **Concluída**.
Uma entrega só é concluída depois do merge, feito pela pessoa responsável.

| # | Entrega | Branch sugerida | Depende de | Status |
| --- | --- | --- | --- | --- |
| 0 | Documentação e coordenação | `docs/project-coordination` | Nenhuma | Concluída (PR #1) |
| 1 | Núcleo financeiro e simulação | `feat/nucleo-simulacao` | 0 | Concluída (PR #2) |
| 2 | API, parâmetros e indicadores | `feat/api-interface` | 1 | Em revisão |
| 3 | Canvas isométrico e estações | `feat/canvas-isometrico` | 2 | Pendente |
| 4 | Reprodução dos eventos | `feat/reproducao-eventos` | 3 | Pendente |
| 5 | Comparação e explicações | `feat/comparacao-cenarios` | 2 | Pendente |
| 6 | Revisão final e demonstração | `docs/revisao-final` | 3, 4 e 5 | Pendente |

## Mudança em relação ao plano original

As entregas 1 e 2 já têm código e testes na pasta de trabalho. Elas passam a **revisar, completar
e versionar** esse código, em vez de reimplementá-lo. A divisão separa as regras sem HTTP (1) da
API e interface (2), porque `api.py` exige a pasta `web/` para iniciar e isso deixa cada PR menor.

## Critérios de aceitação

`[x]` significa que o item existe e foi conferido por teste automatizado ou leitura do código. A
verificação em navegador é um critério à parte e só é marcada quando realmente executada.

### 0. Documentação e coordenação

- [x] `CLAUDE.md` e os quatro documentos refletem o que foi encontrado no repositório.
- [x] O simulador local não é alterado nem incluído no commit.
- [x] PR revisado e integrado pela pessoa responsável.

### 1. Núcleo financeiro e simulação

Arquivos: `parametros.py`, `financeiro.py`, `operacao.py`, `simulacao.py`, `__init__.py`, os testes
desses módulos, `requirements.txt` e `.gitignore`.

- [x] Testes de zero pedidos, contribuição negativa e arredondamento monetário.
- [x] Testes de filas, múltiplos funcionários e conclusão exatamente no fim do turno.
- [x] Teste de desconto negativo ou maior que o preço, sem depender de HTTP.
- [x] Teste de coerência: totais reconstruídos dos eventos coincidem com os da simulação.
- [x] Receita e contribuição contam só pedidos concluídos, com teste sem HTTP.
- [x] Testes passam em um clone limpo da branch, sem API, interface ou dependências HTTP.
- [x] PR revisado e integrado.

### 2. API, parâmetros e indicadores

Arquivos: `api.py`, `web/`, `tests/test_api.py`, `tests/js/`, `README.md` e as dependências `fastapi`,
`uvicorn` e `httpx2` em `requirements.txt`.

- [x] API devolve finanças, operação e eventos, e rejeita parâmetros inválidos com erro por campo.
- [x] `api.py` usa `executar_simulacao`, em vez de repetir a sequência de cálculos.
- [x] Corpo ilegível recebe erro compreensível, e erro inesperado não expõe detalhes internos.
- [x] Testes de `test_api.py` cobrem o contrato HTTP, sem repetir `test_parametros.py`.
- [x] Indicadores de conclusão, filas, espera, receita e contribuição são calculados no servidor.
- [x] Média ausente aparece como "Sem pedidos concluídos", e não como zero.
- [x] Aviso "sem IA conectada" e explicação de contribuição, custos excluídos e demanda informada.
- [x] Cada controle mostra seus limites antes de ocorrer um erro.
- [x] Resposta antiga não sobrescreve o cenário mais recente; espera, falha de conexão e erro do
  servidor têm mensagens próprias.
- [x] Interface utilizável por teclado e sem estouro em 1920, 390 e 320 px de largura.
- [x] Interface verificada em navegador, com o resultado registrado.
- [x] Testes passam em um clone limpo da branch.
- [ ] PR revisado e integrado.

### 3. Canvas isométrico e estações

- [ ] Canvas nativo desenha o restaurante, as estações, as pessoas e as filas.
- [ ] Clicar em uma estação mostra os dados dela no resultado atual.
- [ ] As mesmas informações continuam acessíveis por teclado, fora do Canvas.
- [ ] A detecção de clique tem teste automatizado.

### 4. Reprodução dos eventos

- [ ] Controles de reproduzir, pausar, reiniciar, velocidade e relógio do turno.
- [ ] A posição dos pedidos é derivada apenas dos eventos recebidos do servidor.
- [ ] Teste: no fim do turno, os estados reproduzidos coincidem com os totais do servidor.
- [ ] Alterar parâmetros reinicia a reprodução com os novos eventos.

### 5. Comparação e explicações

- [ ] Fixar o cenário A e comparar seus parâmetros e indicadores com o cenário atual.
- [ ] Teste: mudar o cenário atual não altera o cenário A.
- [ ] Explicações por regras, com teste, baseadas nos valores simulados.
- [ ] As explicações por regras são identificadas como sem IA conectada.
- [ ] Nenhum texto atribui ao desconto um aumento de demanda.

### 6. Revisão final e demonstração

- [ ] Roteiro de demonstração reproduzível a partir de um clone limpo.
- [ ] README revisado, sem repetir `docs/` e sem declarar como pronto o que não está.
- [ ] Revisão completa de escopo, restrições e critérios desta lista.

## Decisões pendentes da pessoa responsável

1. **Descrição do repositório no GitHub:** ainda diz "AI-powered restaurant review analysis using
   Python and Machine Learning", o que não descreve o simulador sem IA. Alterá-la?

## Decisões tomadas

- **Branch `feature/analise-avaliacoes`:** permanece separada do simulador.
