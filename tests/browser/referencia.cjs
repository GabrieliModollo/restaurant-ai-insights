const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

async function testarReferencia() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 320, height: 740 } });
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', erro => erros.push(erro.message));
    const url = process.env.RAI_URL || 'http://127.0.0.1:8020';
    const resposta = await page.goto(url + '/#titulo-comparacao');
    assert.equal(resposta.status(), 200);
    await page.waitForSelector('#status[data-estado="atualizado"]');
    const secao = page.locator('#referencia-csv');
    await secao.locator('summary').press('Enter');
    await secao.getByRole('button', { name: 'Carregar exemplo fictício' }).press('Enter');
    await secao.getByText(/82 concluídos e 3 cancelados/).waitFor();
    assert.equal(await secao.getByRole('row').filter({ hasText: '19h' }).textContent(), '19h393');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const { violations } = await new AxeBuilder({ page }).include('#referencia-csv').analyze();
    assert.deepEqual(violations.map(violacao => violacao.id), []);
    assert.deepEqual(erros, []);
  } finally {
    await browser.close();
  }
}

testarReferencia().catch(erro => {
  console.error(erro);
  process.exitCode = 1;
});
