// Ferramentas opcionais de revisão; instruções em docs/revisao-rai-007.md.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const url = process.env.RAI_URL || 'http://127.0.0.1:8010';
const destinos = ['inicio', 'titulo-parametros', 'titulo-comparacao', 'titulo-financeiro', 'titulo-operacao', 'titulo-explicacoes'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    async function pronto() {
      await page.waitForSelector('#status[data-estado="atualizado"]');
    }
    async function ir(id) {
      await page.locator(`.menu-principal a[href="#${id}"]`).click();
      await page.waitForFunction(id => document.activeElement?.id === id, id);
      assert.ok(await page.locator(`#${id}`).isVisible(), id);
      assert.equal(await page.locator('[data-pagina]:visible').count(), 1);
      assert.equal(await page.locator('.menu-principal [aria-current="page"]').count(), 1);
    }
    if (!process.env.RAI_SO_FLUXOS) for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await pronto();
        for (const id of destinos) {
          await ir(id);
          if (id === 'titulo-operacao') await page.locator('.dados-operacao').evaluate(e => e.open = true);
          if (id === 'titulo-parametros') await page.locator('.grupo-recolhido').evaluate(e => e.open = true);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
            `Estouro: ${width}, ${colorScheme}, ${id}`);
          const { violations } = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(violations.map(v => ({ id: v.id, alvos: v.nodes.map(n => n.target) })), [],
            `Acessibilidade: ${width}, ${colorScheme}, ${id}`);
        }
        console.log(`OK: ${width}px, ${colorScheme}, seis áreas, axe e dimensões`);
      }
    }
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(url);
    await pronto();
    await page.screenshot({ path: 'tmp/rai-007-dashboard.png', fullPage: true });
    // Mantém uma requisição pendente para conferir o estado de carregamento.
    await ir('titulo-parametros');
    let receberRota;
    const recebida = new Promise(resolve => { receberRota = resolve; });
    await page.route('**/api/simulacoes', rota => receberRota(rota));
    await page.locator('#campo-preco_venda').fill('36');
    const pendente = await recebida;
    assert.equal(await page.locator('#status').getAttribute('data-estado'), 'calculando');
    assert.equal(await page.locator('#simular-cenario').isDisabled(), true);
    await pendente.continue();
    await page.unroute('**/api/simulacoes');
    await pronto();
    await page.locator('#campo-preco_venda').fill('35');
    await pronto();
    await ir('titulo-comparacao');
    assert.ok(await page.locator('.comparacao-vazia').isVisible());
    await page.locator('#a-salvar').click();
    await ir('titulo-parametros');
    await page.locator('#campo-preco_venda').fill('40');
    await pronto();
    await page.screenshot({ path: 'tmp/rai-007-simulador.png', fullPage: true });
    await page.locator('#simular-cenario').click();
    await page.waitForURL('**/#inicio');
    await pronto();
    assert.match(await page.locator('#kpi-contribuicao').textContent(), /360/);
    await ir('titulo-comparacao');
    assert.ok(await page.locator('.tabela-comparacao').isVisible());
    assert.match(await page.locator('.lista-alterados').textContent(), /35.*40/);
    await page.locator('#a-salvar').click();
    assert.match(await page.locator('#a-anuncio').textContent(), /substituído/);
    await page.locator('#a-limpar').click();
    assert.ok(await page.locator('.comparacao-vazia').isVisible());
    await ir('titulo-parametros');
    assert.equal(await page.locator('#campo-preco_venda').inputValue(), '40');
    await page.locator('#campo-desconto').fill('100');
    await page.waitForSelector('#status[data-estado="desatualizado"]');
    await page.locator('#simular-cenario').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'campo-desconto');
    assert.match(await page.locator('#erro-desconto').textContent(), /maior que o preço/);
    await page.locator('#campo-desconto').fill('0');
    await pronto();
    await page.locator('#campo-desconto').fill('30');
    await pronto();
    await ir('inicio');
    assert.ok(await page.locator('#kpi-contribuicao.valor-negativo').isVisible());
    await ir('titulo-parametros');
    await page.locator('#campo-desconto').fill('0');
    await pronto();
    await page.locator('#campo-pedidos').fill('0');
    await pronto();
    await ir('inicio');
    assert.equal(await page.locator('#kpi-tempo').textContent(), 'Sem pedidos concluídos');
    await ir('titulo-parametros');
    await page.locator('#exemplos summary').click();
    await page.locator('#lista-exemplos button').nth(1).click();
    await pronto();
    await ir('inicio');
    assert.match(await page.locator('#kpi-gargalos').textContent(), /Preparo/);
    await ir('titulo-operacao');
    await page.locator('#reproducao-alternar').click();
    await page.waitForFunction(() => document.getElementById('reproducao-alternar').textContent.includes('Pausar'));
    await ir('inicio');
    await ir('titulo-operacao');
    assert.match(await page.locator('#reproducao-alternar').textContent(), /Continuar|Iniciar/);
    await page.locator('#reproducao-fim').click();
    await page.locator('[data-estacao="preparo"]').click();
    assert.match(await page.locator('#cena-detalhe').textContent(), /Preparo/);
    await page.screenshot({ path: 'tmp/rai-007-restaurante.png', fullPage: true });
    await page.goBack();
    assert.ok(await page.locator('#inicio').isVisible());
    await page.goto(`${url}/#titulo-estacoes`);
    await pronto();
    assert.ok(await page.locator('#titulo-estacoes').isVisible());
    await page.setViewportSize({ width: 390, height: 844 });
    await ir('inicio');
    await page.screenshot({ path: 'tmp/rai-007-mobile.png', fullPage: true });
    // Erro de primeira carga e recuperação pelo botão global.
    await page.route('**/api/campos', route => route.abort());
    await page.goto(url);
    await page.waitForSelector('#status[data-estado="erro"]');
    assert.ok(await page.locator('#vazio').isVisible());
    assert.ok(await page.locator('#tentar-novamente').isVisible());
    await page.unroute('**/api/campos');
    await page.locator('#tentar-novamente').click();
    await pronto();
    // Erro posterior preserva os dados e permite tentar novamente.
    await page.route('**/api/simulacoes', route => route.fulfill({ status: 500, body: '{}' }));
    await ir('titulo-parametros');
    await page.locator('#campo-preco_venda').fill('41');
    await page.waitForSelector('#status[data-estado="erro"]');
    assert.equal(await page.locator('#campo-preco_venda').inputValue(), '41');
    await page.unroute('**/api/simulacoes');
    await page.locator('#tentar-novamente').click();
    await pronto();
    // Navegação por teclado e âncora repetida.
    const link = page.locator('.menu-principal a[href="#inicio"]');
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'inicio');
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'inicio');
    assert.deepEqual(erros, []);
    console.log('OK: simulação, preservação de campos, comparação, validação, zero pedidos, exemplos, gargalos, reprodução, histórico, links diretos, erros e recuperação, teclado e console');
  } finally { await browser.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
