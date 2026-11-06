# Revisão da RAI-007 (PR #8)

## Correções

- Links do menu, guia e salto para o simulador revelam a vista de destino no celular e levam o foco ao título. Links diretos aguardam a carga dos resultados.
- A barra lateral pode encolher e rolar; os cartões das estações cabem em 320 px. O ícone do guia mantém seu tamanho.
- Texto secundário mais escuro no tema claro para atender contraste mínimo de 4,5:1.
- Ícones decorativos não entram no nome acessível dos links; removido o indicador fixo de página atual.
- O teste HTTP do primeiro uso acompanha os três passos do novo guia.

## Como repetir a verificação em navegador

Ferramentas opcionais de desenvolvimento, sem dependências novas no produto. Chrome instalado no Windows, executado sem janela pelo Playwright. As versões fixas permitem repetir esta revisão; axe cobre regras automatizáveis, sem garantir acessibilidade completa.

Na raiz do projeto, com o servidor local na porta 8017:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.simulador.api:app --host 127.0.0.1 --port 8017
```

Em outro terminal:

```powershell
npm install --prefix .tmp-ui --no-package-lock --no-save playwright@1.58.2 @axe-core/playwright@4.11.1
$env:NODE_PATH = "$PWD/.tmp-ui/node_modules"
node tests/browser/interface.cjs
```

`RAI_URL` permite apontar para outro servidor. As capturas ficam em `tmp/`, fora do Git.

O roteiro verifica 320, 390, 860, 861, 1100, 1101, 1440 e 1920 px, nas duas vistas e nos temas claro e escuro; estouro horizontal, axe, links por teclado, foco, âncora repetida, link direto e erros JavaScript. A preferência por menos movimento é emulada pelo navegador.

Não substitui testes com leitor de tela, toque, aparelho físico, zoom real, outros navegadores ou pessoas reais.
