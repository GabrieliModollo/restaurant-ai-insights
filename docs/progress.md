# Progresso

Última atualização: 2026-11-04.

## Estado atual

- **Entregas 0 a 5:** integradas à `main` pelos PRs #1 a #6 (último merge `6ecf8bf`).
- **Entrega 6:** em revisão, na branch `docs/revisao-final`. Encerra o MVP.

| Situação | Estado |
| --- | --- |
| Conclusão técnica do MVP | Concluída, sujeita à revisão do PR |
| Validação com usuários | **Pendente: usabilidade ainda não validada com usuários** |
| Publicação | Não realizada nem autorizada; a aplicação roda localmente |

A classificação de cada critério está em `docs/backlog.md`. Nada do simulador continua local e sem
commit. `feature/analise-avaliacoes` segue separada do simulador.

## Verificações executadas

Todas são **verificações técnicas, e não testes com usuários**.

**Clone limpo do commit `9195b4b`, o último com código**, em pasta nova, no Windows, com Python 3.15.0
e Node 24. Commits posteriores alteram apenas documentação e capturas. Um arquivo não pode citar o
próprio commit, então o SHA final e o resultado do clone dele ficam na descrição do PR.

| Verificação | Resultado |
| --- | --- |
| Roteiro do README: ambiente virtual novo, instalação e `pip check` | Sem erros |
| `pytest` | 176 aprovados |
| `node --test "tests/js/*.test.mjs"` | 97 aprovados |
| Servidor iniciado com `--reload` e sem ele | `GET /` com 200 |
| Busca por credenciais, arquivos temporários e recursos externos | Nada encontrado |
| Dependências de `requirements.txt` | Todas em uso |

**Navegador:** Chrome real, em tema escuro, com o servidor do clone limpo e sem erros no console.

| Fluxo | Resultado |
| --- | --- |
| Fluidez em execução normal | 60 quadros por segundo, 0,31 ms por quadro; 8 minutos do turno em 4 s, como esperado |
| Contribuição negativa | Resumo com o valor negativo e ponto de atenção de R$ 5,50 por pedido |
| Zero pedidos | Conclusão própria e "Sem pedidos concluídos" nas médias |
| Turnos diferentes | Aviso de períodos diferentes |
| Guardar, substituir e limpar A | Funcionam, com foco preservado |
| Teclado | Tab e botões funcionam; foco visível |
| Atalhos em 390, 320 e 640 px, em `iframe` | Levam ao restaurante, sem estouro |

**Defeito encontrado e corrigido:** no celular, o restaurante ficava a mais de 2.200 px do topo. Foram
acrescentados atalhos para as partes dos resultados, sem esconder conteúdo.

**Com simulação, e não em condição real:**

| Situação | Como foi feita | Resultado |
| --- | --- | --- |
| Falha de `/api/campos` na primeira carga | `fetch` substituído em `iframe` | Mensagem e botão; recuperou ao repetir |
| Troca de aba | `document.hidden` substituído | Pausa e continua pausada |
| Menos movimento | `matchMedia` substituído | Só etapas, sem quadros |
| Tema claro | Regras do tema escuro removidas na página | Legível |
| Zoom | Larguras menores em `iframe`, como aproximação | Sem estouro |

## Limitações de ambiente

- **Troca real de aba:** a ferramenta de navegador captura outra aba sem colocá-la em primeiro plano,
  então a página continuou visível e o teste real não foi possível.
- **Preferência real por menos movimento e tema claro real:** dependem de configurações do sistema,
  que não foram alteradas.
- **Não verificado:** aparelho real, toque, zoom real, tela de alta densidade, outros navegadores,
  leitor de tela e sistemas além do Windows.
- **Fluidez:** medida nesta máquina, em números. A impressão visual de uma pessoa não foi avaliada, e
  com quadros mais espaçados que 1 s o relógio atrasa.

## Próxima tarefa

Depende de pessoas reais: conduzir as sessões de `docs/teste-de-uso.md`. Com as observações em mãos, o
Claude Code pode analisá-las e corrigir os problemas prioritários.

Decisões pendentes estão em `docs/backlog.md`.
