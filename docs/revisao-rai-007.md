# Revisão da RAI-007 (PR #8)

## Refatoração completa

- Referência inspecionada: `Painel de Insights para Restaurante IA.png`, fornecida em Downloads. Segue a composição e a direção visual, com ilustração vetorial própria e adaptação aos contratos reais; não é reprodução exata da imagem.
- Dashboard com boas-vindas, quatro indicadores principais, guia e convite à simulação. Margem de contribuição em reais, pedidos concluídos, tempo total médio e gargalos vêm da API.
- Seis áreas: Visão geral, Simulador, Cenários, Financeiro, Restaurante e Ajuda. Apenas uma aparece por vez; parâmetros e cenário A permanecem montados. Navegação com histórico, links diretos, foco, título e indicação de área ativa.
- Simulador com grupos de preço/demanda, custos e equipe/tempos. Botão Simular cenário abre o dashboard após calcular; a atualização automática ao editar foi preservada.
- Animação integrada à área Restaurante, pausando ao sair; controles, seleção de estações e informações do turno preservados. Legenda e dados secundários expansíveis.
- No celular, seis destinos do menu visíveis e guia recolhido. Temas claro/escuro, ícones vetoriais e foco consistente.
- Carregamento, erro inicial, repetição, resultado anterior, comparação vazia, zero pedidos e contribuição negativa têm apresentação e feedback.
- Nenhuma alteração na API, nas regras financeiras ou operacionais. Sem dependências novas no produto, contas fictícias, IA conectada, lucro estimado ou tendências inventadas.

## Como repetir a verificação em navegador

Ferramentas opcionais de desenvolvimento, sem dependências novas no produto. Chrome instalado no Windows, executado sem janela pelo Playwright. As versões fixas permitem repetir esta revisão; axe cobre regras automatizáveis, sem garantir acessibilidade completa.

Na raiz do projeto, com o servidor local na porta 8010:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --host 127.0.0.1 --port 8010
```

Em outro terminal:

```powershell
npm install --prefix .tmp-ui --no-package-lock --no-save playwright@1.58.2 @axe-core/playwright@4.11.1
$env:NODE_PATH = "$PWD/.tmp-ui/node_modules"
node tests/browser/interface.cjs
```

`RAI_URL` permite apontar para outro servidor. As capturas ficam em `tmp/`, fora do Git.

O roteiro verifica 320, 390, 768, 1024, 1440 e 1920 px nas seis áreas e nos temas claro e escuro, inclusive com grupos expansíveis abertos: 72 combinações sem estouro horizontal ou violações detectadas pelo axe.

Fluxos: carregamento pendente; simulação explícita e retorno ao dashboard; preservação dos campos; guardar, substituir e limpar A; mudança de parâmetros e tabela de diferenças; validação e foco no erro; contribuição negativa; zero pedidos; exemplos; gargalos; reprodução e pausa ao navegar; seleção; histórico; links diretos; falhas inicial e posterior com recuperação; teclado e âncora repetida; ausência de erros JavaScript. Menos movimento é emulado pelo navegador na matriz; os fluxos de reprodução usam movimento normal.

Para repetir apenas os fluxos, defina `$env:RAI_SO_FLUXOS = "1"` antes do comando. Remova a variável para repetir a matriz completa.

`pytest.ini` limita a coleta a `tests/`, evitando que clones temporários de revisão sejam coletados como testes do projeto.

Não substitui testes com leitor de tela, toque, aparelho físico, zoom real, outros navegadores ou pessoas reais.
