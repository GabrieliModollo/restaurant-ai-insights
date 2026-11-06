// Ferramentas de revisão opcionais; instalação e execução em docs/revisao-rai-007.md.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    const url = process.env.RAI_URL || 'http://127.0.0.1:8017';
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const width of [320, 390, 860, 861, 1100, 1101, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await page.waitForSelector('#resultados:not([hidden])', { state: 'attached' });
        for (const vista of ['ajustar', 'resultados']) {
          if (width <= 860) {
            await page.locator(`.navegacao-movel [data-ir-para="${vista}"]`).click();
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
            `Estouro horizontal: ${width}, ${colorScheme}, ${vista}`);
          const { violations } = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(violations.map(v => ({ id: v.id, destinos: v.nodes.map(n => n.target) })), [],
            `Acessibilidade: ${width}, ${colorScheme}, ${vista}`);
        }
        console.log(`OK: ${width}px, ${colorScheme}, ambas as vistas`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.waitForSelector('#resultados:not([hidden])', { state: 'attached' });
    // Exercita links que atravessam as vistas, repetição da âncora e teclado.
    for (const seletor of [
      '.menu-principal a[href="#titulo-financeiro"]',
      '.menu-principal a[href="#titulo-parametros"]',
      '.guia a[href="#titulo-resumo"]',
      '.guia a[href="#titulo-cena"]',
      '.guia a[href="#titulo-cena"]',
      '.menu-principal a[href="#titulo-comparacao"]',
      '.pular-conteudo',
    ]) {
      const link = page.locator(seletor);
      await link.focus();
      const destino = await link.getAttribute('href');
      await page.keyboard.press('Enter');
      await page.waitForFunction(id => document.activeElement?.id === id, destino.slice(1));
      assert.ok(await page.locator(destino).isVisible(), destino);
    }
    await page.goto(`${url}/#titulo-operacao`);
    await page.waitForFunction(() => document.activeElement?.id === 'titulo-operacao');
    assert.ok(await page.locator('#titulo-operacao').isVisible());
    assert.deepEqual(erros, []);
    await page.screenshot({ path: 'tmp/rai-007-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    await page.waitForSelector('#resultados:not([hidden])', { state: 'attached' });
    await page.screenshot({ path: 'tmp/rai-007-desktop.png', fullPage: true });
    console.log('OK: links, teclado, foco, link direto e console');
  } finally {
    await browser.close();
  }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
