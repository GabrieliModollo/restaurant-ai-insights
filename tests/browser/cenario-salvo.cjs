const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

async function testarArquivo() {
  const browser = await chromium.launch();
  try {
    const contexto = await browser.newContext({ viewport: { width: 320, height: 740 } });
    const page = await contexto.newPage();
    const url = process.env.RAI_URL || 'http://127.0.0.1:8020';
    await page.goto(url + '/#titulo-parametros');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('#ficha-tecnica > summary').click();
    await page.locator('#ficha-exemplo').click();
    await page.locator('#ficha-calcular').click();
    await page.getByText(/Custo de ingredientes por porção:/).waitFor();
    await page.goto(url + '/#titulo-comparacao');
    await page.locator('#promocao-exemplo').click();
    await page.waitForSelector('#promocao-resultado[data-desatualizado="false"]:not([hidden])');
    await page.locator('#promocao-detalhes > summary').click();
    await page.locator('#alternativa-custo').fill('20');
    await page.getByRole('button', { name: 'Comparar alternativas' }).click();
    await page.getByRole('heading', { name: 'Reforço de equipe', exact: true }).waitFor();
    const painel = page.locator('#cenario-salvo');
    await painel.locator('summary').press('Enter');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      painel.getByRole('button', { name: 'Baixar cenário JSON' }).press('Enter'),
    ]);
    const caminho = await download.path();
    const salvo = JSON.parse(await readFile(caminho, 'utf8'));
    assert.equal(salvo.versao, 1);
    assert.equal(salvo.ficha.ingredientes[0].nome, 'Farinha');
    assert.equal(salvo.alternativas.custo_adicional_centavos, 2000);

    await page.reload();
    await page.waitForSelector('#status[data-estado="atualizado"]');
    if (await painel.getAttribute('open') === null) await painel.locator('summary').press('Enter');
    const arquivo = painel.getByLabel('Arquivo de cenário');
    await arquivo.setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{') });
    const abrir = painel.getByRole('button', { name: 'Reabrir cenário', exact: true });
    await abrir.click();
    await painel.getByText(/Arquivo inválido ou incompatível/).waitFor();
    await arquivo.setInputFiles({ name: 'cenario.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(salvo)) });
    await abrir.click();
    await painel.getByRole('heading', { name: 'Resumo do cenário reaberto' }).waitFor();
    await painel.getByText(/Custo adicional de R\$\s*20,00/i).waitFor();
    await painel.getByText(/Farinha/).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const { violations } = await new AxeBuilder({ page }).include('#cenario-salvo').analyze();
    assert.deepEqual(violations.map(violacao => violacao.id), []);
    const [resumo] = await Promise.all([
      page.waitForEvent('download'),
      painel.getByRole('button', { name: 'Exportar resumo reaberto' }).click(),
    ]);
    assert.match(await readFile(await resumo.path(), 'utf8'), /Cenário de referência[\s\S]*Farinha[\s\S]*Custos e limites/);
  } finally {
    await browser.close();
  }
}

testarArquivo().catch(erro => {
  console.error(erro);
  process.exitCode = 1;
});
