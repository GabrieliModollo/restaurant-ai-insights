const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const url = process.env.RAI_URL || 'http://127.0.0.1:8020';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    let carga = 0;
    async function abrir() {
      await page.goto(`${url}/?revisao=${carga++}#titulo-comparacao`);
      await page.waitForSelector('#status[data-estado="atualizado"]');
      assert.match(await page.locator('#promocao-status').textContent(), /Guarde o cenário A/);
      assert.equal(await page.locator('#promocao-controles').isVisible(), false);
      await page.locator('#a-salvar').click();
    }
    async function analisar(desconto = '5', pedidos = '20') {
      await page.locator('#promocao-desconto').fill(desconto);
      await page.locator('#promocao-pedidos').fill(pedidos);
      await page.locator('#promocao-analisar').click();
      await page.waitForSelector('#promocao-resultado:not([hidden])');
    }
    if (!process.env.RAI_SO_FLUXOS) for (const tema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await abrir(); await analisar();
        assert.match(await page.locator('.promocao-metricas').textContent(), /25 concluídos.*7 concluídos a mais/);
        assert.match(await page.locator('.promocao-conclusao').textContent(), /não concluem/);
        assert.equal(await page.locator('#campo-pedidos').inputValue(), '20');
        for (const negativo of [false, true]) {
          if (negativo) await analisar('25');
          await page.locator('.promocao-detalhamento').evaluate(e => e.open = true);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Estouro em ${width}px`);
          const { violations } = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(violations.map(v => ({ id: v.id, alvos: v.nodes.map(n => n.target) })), [], `${width}, ${tema}, negativo=${negativo}`);
        }
        if (width === 1440 && tema === 'light') {
          await analisar();
          await page.locator('.promocao-painel').screenshot({ path: 'tmp/rai-008-promocao-desktop.png' });
        }
        if (width === 390 && tema === 'light') {
          await analisar();
          await page.locator('.promocao-painel').screenshot({ path: 'tmp/rai-008-promocao-mobile.png' });
        }
        console.log(`OK promoção: ${width}px, ${tema}, margens positiva e negativa, axe e dimensões`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrir(); await analisar('0');
    assert.match(await page.locator('.promocao-conclusao').textContent(), /iguala ou supera/);
    await analisar('5', '1000');
    assert.match(await page.locator('.tabela-promocao').textContent(), /1.000/);
    assert.match(await page.locator('#promocao-resultado').textContent(), /máximo 22/);
    await page.locator('#promocao-desconto').fill('36');
    await page.locator('#promocao-analisar').click();
    assert.match(await page.locator('#promocao-erro-desconto').textContent(), /maior que o preço/);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'promocao-desconto');
    await page.locator('#promocao-desconto').fill('5');
    await page.locator('#promocao-pedidos').fill('1.5');
    await page.locator('#promocao-analisar').click();
    assert.match(await page.locator('#promocao-erro-pedidos').textContent(), /inteiro/);
    await page.route('**/api/promocoes', rota => rota.fulfill({ status: 500, body: '{}' }));
    await page.locator('#promocao-pedidos').fill('20');
    await page.locator('#promocao-analisar').click();
    await page.waitForFunction(() => document.getElementById('promocao-status').textContent.includes('erro (código 500)'));
    await page.unroute('**/api/promocoes');
    await analisar();
    // Uma resposta pendente nunca reaparece depois de remover a referência.
    let receber;
    const recebida = new Promise(resolve => receber = resolve);
    await page.route('**/api/promocoes', rota => receber(rota));
    await page.locator('#promocao-analisar').click();
    const pendente = await recebida;
    assert.equal(await page.locator('#promocao-analisar').isDisabled(), true);
    await page.locator('#a-limpar').click();
    await pendente.continue().catch(() => {});
    await page.unroute('**/api/promocoes');
    assert.equal(await page.locator('#promocao-resultado').isVisible(), false);
    await page.locator('#a-salvar').click();
    await analisar();
    await page.locator('.menu-principal a[href="#titulo-parametros"]').click();
    await page.locator('#campo-preco_venda').fill('40');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('.menu-principal a[href="#titulo-comparacao"]').click();
    assert.equal(await page.locator('#promocao-resultado').isVisible(), false);
    assert.equal(await page.locator('#promocao-desconto').inputValue(), '0');
    await page.locator('#promocao-desconto').focus();
    await page.keyboard.type('5'); await page.keyboard.press('Enter');
    await page.waitForSelector('#promocao-resultado:not([hidden])');
    await page.locator('#promocao-resultado .ajuda summary').click();
    assert.match(await page.locator('#promocao-resultado .ajuda').textContent(), /Variação.*base/);
    // Margem zero com referência positiva não oferece uma meta de vendas.
    await page.locator('.menu-principal a[href="#titulo-parametros"]').click();
    await page.locator('#campo-preco_venda').fill('20');
    await page.locator('#campo-taxa_canal_pct').fill('30');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('.menu-principal a[href="#titulo-comparacao"]').click();
    await analisar('0');
    assert.match(await page.locator('.promocao-metricas').textContent(), /Sem volume que compense/);
    assert.match(await page.locator('.promocao-alertas').textContent(), /por pedido é zero/);
    // Base negativa: máximo de conclusões admissíveis, nunca sugestão de vender mais.
    await page.locator('.menu-principal a[href="#titulo-parametros"]').click();
    await page.locator('#campo-preco_venda').fill('35');
    await page.locator('#campo-taxa_canal_pct').fill('15');
    await page.locator('#campo-desconto').fill('25');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('.menu-principal a[href="#titulo-comparacao"]').click();
    await page.locator('#a-salvar').click();
    await analisar('30');
    assert.match(await page.locator('#promocao-resultado').textContent(), /no máximo 10 conclusões/);
    assert.match(await page.locator('.promocao-conclusao').textContent(), /Aumentar pedidos piora/);
    await page.locator('.promocao-painel').screenshot({ path: 'tmp/rai-008-base-negativa.png' });
    // Uma referência com zero pedidos não produz divisão por zero.
    await page.locator('.menu-principal a[href="#titulo-parametros"]').click();
    await page.locator('#campo-pedidos').fill('0');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('.menu-principal a[href="#titulo-comparacao"]').click();
    await page.locator('#a-salvar').click();
    await analisar('0', '0');
    assert.match(await page.locator('.tabela-promocao').textContent(), /Não definido \(base zero\)/);
    if (process.env.RAI_SO_FLUXOS) {
      await abrir(); await analisar();
      await page.emulateMedia({ colorScheme: 'light' });
      await page.locator('.promocao-painel').screenshot({ path: 'tmp/rai-008-promocao-desktop.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await analisar();
      await page.locator('.promocao-painel').screenshot({ path: 'tmp/rai-008-promocao-mobile.png' });
    }
    assert.deepEqual(erros, []);
    console.log('OK: base compartilhada, preservação do simulador, validação e foco, hipóteses de volume, falha e recuperação, descarte de resposta antiga, edição de cenário e teclado');
  } finally { await browser.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
