# Backlog

Status possíveis: **Pendente**, **Código local sem commit**, **Em revisão** e **Concluída**.
Uma entrega só é concluída depois do merge, feito pela pessoa responsável.

| # | Entrega | Branch sugerida | Depende de | Status |
| --- | --- | --- | --- | --- |
| 0 | Documentação e coordenação | `docs/project-coordination` | Nenhuma | Em revisão |
| 1 | Núcleo financeiro e simulação | `feat/nucleo-simulacao` | 0 | Código local sem commit |
| 2 | API, parâmetros e indicadores | `feat/api-interface` | 1 | Código local sem commit |
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
- [ ] PR revisado pela pessoa responsável.

### 1. Núcleo financeiro e simulação

Arquivos: `parametros.py`, `financeiro.py`, `operacao.py`, `__init__.py`, os testes desses módulos,
`requirements.txt` e `.gitignore`.

- [x] Testes de zero pedidos, contribuição negativa e arredondamento monetário.
- [x] Testes de filas, múltiplos funcionários e conclusão exatamente no fim do turno.
- [ ] Teste de desconto inválido sem depender de HTTP. Hoje ele só existe em `tests/test_api.py`,
  que pertence à entrega 2.
- [ ] Testes passam em um clone limpo da branch, após instalar `requirements.txt`.

### 2. API, parâmetros e indicadores

Arquivos: `api.py`, `web/`, `tests/test_api.py` e `README.md`.

- [x] API devolve finanças, operação e eventos, e rejeita parâmetros inválidos com erro por campo.
- [x] Indicadores de conclusão, filas, espera, receita e contribuição são calculados no servidor.
- [x] Aviso de simulação ilustrativa e explicação dos custos excluídos aparecem na interface.
- [ ] **Lacuna:** cada controle mostra seus limites antes de ocorrer um erro.
- [ ] Interface verificada em navegador, com o resultado registrado.
- [ ] Testes passam em um clone limpo da branch.

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
- [ ] **Lacuna:** a interface identifica as explicações como sem IA conectada.
- [ ] Nenhum texto atribui ao desconto um aumento de demanda.

### 6. Revisão final e demonstração

- [ ] Roteiro de demonstração reproduzível a partir de um clone limpo.
- [ ] README revisado, sem repetir `docs/` e sem declarar como pronto o que não está.
- [ ] Revisão completa de escopo, restrições e critérios desta lista.

## Decisões pendentes da pessoa responsável

1. **Branch `feature/analise-avaliacoes`:** tem dois commits fora da `main` e um módulo sem testes,
   não usado pelo simulador. Manter separada, integrar ou encerrar?
2. **Descrição do repositório no GitHub:** ainda diz "AI-powered restaurant review analysis using
   Python and Machine Learning", o que não descreve o simulador sem IA. Alterá-la?
