# Backlog

Status possíveis: **Pendente**, **Código local sem commit**, **Em revisão** e **Concluída**.
Uma entrega só é concluída depois do merge, feito pela pessoa responsável.

| # | Entrega | Branch sugerida | Depende de | Status |
| --- | --- | --- | --- | --- |
| 0 | Documentação e coordenação | `docs/project-coordination` | Nenhuma | Concluída (PR #1) |
| 1 | Núcleo financeiro e simulação | `feat/nucleo-simulacao` | 0 | Concluída (PR #2) |
| 2 | API, parâmetros e indicadores | `feat/api-interface` | 1 | Concluída (PR #3) |
| 3 | Canvas isométrico e estações | `feat/canvas-isometrico` | 2 | Concluída (PR #4) |
| 4 | Reprodução dos eventos e primeiro uso | `feat/reproducao-eventos` | 3 | Em revisão |
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
- [x] PR revisado e integrado.

### 3. Canvas isométrico e estações

- [x] Canvas nativo desenha piso, preparo, embalagem, retirada, pessoas e filas.
- [x] A cena avisa que representa o fim do turno, com os valores recebidos do servidor.
- [x] Quantidades grandes são agrupadas, com os totais exatos escritos.
- [x] Clicar em uma estação mostra os dados dela no resultado atual, com destaque visual.
- [x] Botões HTML selecionam as estações por teclado; os dados continuam fora do Canvas.
- [x] Seleção e gargalo aparecem também em texto, sem depender só de cor.
- [x] Geometria, modelo, detecção de clique, desenho e página em módulos separados.
- [x] A detecção de clique, a escala e o agrupamento têm testes automatizados.
- [x] O Canvas acompanha o painel e a densidade de pixels, sem repetição contínua.
- [x] Em espera, entrada inválida ou falha, a cena indica que é o último cenário válido.
- [x] Verificada no navegador em desktop, 390 e 320 px de largura.
- [x] Testes passam em um clone limpo da branch.
- [x] PR revisado e integrado.

### 4. Reprodução dos eventos e primeiro uso

Reprodução:

- [x] Iniciar, pausar, reiniciar, velocidade e relógio, sem início automático.
- [x] O estado de cada instante é derivado apenas dos eventos recebidos do servidor.
- [x] Teste: ao terminar, os totais reconstruídos coincidem com os da API.
- [x] Alterar parâmetros para a reprodução anterior e volta ao início.
- [x] A cena mostra o momento do relógio; os indicadores são identificados como do turno completo.
- [x] A estação selecionada separa o momento dos dados do turno completo.
- [x] O ciclo de quadros só existe durante a reprodução; ao voltar de outra aba, fica pausado.
- [x] Com menos movimento pedido pelo sistema, o acompanhamento é por etapas.

Primeiro uso (orientação para quem tem pouca familiaridade com software):

- [x] Orientação curta antes do formulário; cenário inicial utilizável sem preencher nada.
- [x] Parâmetros agrupados, com equipe e tempos recolhíveis e custos sempre visíveis.
- [x] "Atend." e "prontos" trocados por textos claros; legenda dividida em itens curtos.
- [x] Navegação explícita no celular entre "Ajustar cenário" e "Ver resultados", sem perder valores.
- [x] Verificado no navegador em desktop, 390 e 320 px de largura, e por teclado.
- [x] Testes passam em um clone limpo da branch.
- [ ] PR revisado e integrado.

### 5. Comparação e explicações

- [ ] Fixar o cenário A e comparar seus parâmetros e indicadores com o cenário atual.
- [ ] Teste: mudar o cenário atual não altera o cenário A.
- [ ] Explicações por regras, com teste, baseadas nos valores simulados.
- [ ] As explicações por regras são identificadas como sem IA conectada.
- [ ] Nenhum texto atribui ao desconto um aumento de demanda.
- [ ] Resumo em linguagem simples, com números e o significado deles.
- [ ] Ajuda contextual para os termos, sem renomear contribuição como lucro.
- [ ] Três exemplos fictícios, identificados como tais.

### 6. Revisão final e demonstração

- [ ] Roteiro de demonstração reproduzível a partir de um clone limpo.
- [ ] README revisado, sem repetir `docs/` e sem declarar como pronto o que não está.
- [ ] Revisão completa de escopo, restrições e critérios desta lista.
- [ ] Teste de uso real com as tarefas abaixo, corrigindo os problemas prioritários.
- [ ] Se o teste não ocorrer, declarar explicitamente a ausência de validação com usuários.

Tarefas do teste de uso:

1. Descobrir quantos pedidos ficam prontos no cenário inicial.
2. Alterar preço ou desconto e explicar o efeito no resultado.
3. Identificar onde há pedidos esperando e comparar uma mudança de equipe.

Registrar conclusão sem ajuda, erros, pedidos de ajuda e interpretações incorretas. Não inventar
participantes, observações ou resultados.

## Decisões pendentes da pessoa responsável

1. **Descrição do repositório no GitHub:** ainda diz "AI-powered restaurant review analysis using
   Python and Machine Learning", o que não descreve o simulador sem IA. Alterá-la?

## Decisões tomadas

- **Branch `feature/analise-avaliacoes`:** permanece separada do simulador.
