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
      assert.match(await page.locator('#promocao-status').textContent(), /Escolha um exemplo/);
      assert.equal(await page.locator('#promocao-controles').isVisible(), false);
      await page.locator('#promocao-propria').click();
    }
    async function editar() {
      if (await page.locator('#promocao-ajustes').getAttribute('open') === null) {
        await page.locator('#promocao-editar').click();
      }
    }
    async function analisar(desconto = '5', pedidos = '20') {
      await editar();
      await page.locator('#promocao-desconto').fill(desconto);
      await page.locator('#promocao-pedidos').fill(pedidos);
      await page.locator('#promocao-analisar').click();
      await page.waitForSelector('#promocao-resultado[data-desatualizado="false"]:not([hidden])');
    }
    if (!process.env.RAI_SO_FLUXOS) for (const tema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: tema, reducedMotion: 'reduce' });
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await abrir(); await analisar();
        assert.match(await page.locator('.promocao-metricas').textContent(), /25 concluídos.*22 pedidos/);
        assert.match(await page.locator('.promocao-conclusao').textContent(), /não se concluem/);
        assert.equal(await page.locator('#campo-pedidos').inputValue(), '20');
        for (const negativo of [false, true]) {
          if (negativo) await analisar('25');
          await page.locator('#promocao-detalhes, .promocao-detalhamento').evaluateAll(detalhes => detalhes.forEach(e => e.open = true));
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
    await editar();
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
    await editar();
    await page.locator('#promocao-analisar').click();
    const pendente = await recebida;
    assert.equal(await page.locator('#promocao-analisar').isDisabled(), true);
    await page.locator('#comparacao-avancada > summary').click();
    await page.locator('#a-limpar').click();
    await pendente.continue().catch(() => {});
    await page.unroute('**/api/promocoes');
    assert.equal(await page.locator('#promocao-resultado').isVisible(), false);
    await page.locator('#a-salvar').click();
    await analisar('7', '42');
    await page.locator('.menu-principal a[href="#titulo-parametros"]').click();
    await page.locator('#campo-preco_venda').fill('40');
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('.menu-principal a[href="#titulo-comparacao"]').click();
    await page.waitForSelector('#promocao-resultado[data-desatualizado="true"]:visible');
    assert.equal(await page.locator('#promocao-desatualizada').isVisible(), true);
    assert.equal(await page.locator('#promocao-desconto').inputValue(), '7');
    assert.equal(await page.locator('#promocao-pedidos').inputValue(), '42');
    await editar();
    await page.locator('#promocao-desconto').fill('5');
    await page.locator('#promocao-desconto').press('Enter');
    await page.waitForSelector('#promocao-resultado[data-desatualizado="false"]:not([hidden])');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'promocao-titulo-resultado');
    assert.equal(await page.locator('#promocao-desatualizada').isVisible(), false);
    await page.locator('#promocao-detalhes > summary').click();
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
    // A demo abre pronta, mantém os cenários do usuário e oferece duas alternativas.
    await page.goto(url);
    await page.waitForSelector('#status[data-estado="atualizado"]');
    await page.locator('#testar-promocao').click();
    await page.waitForSelector('#promocao-resultado[data-desatualizado="false"]:not([hidden])');
    assert.equal(await page.locator('#promocao-desconto').inputValue(), '5');
    assert.match(await page.locator('.promocao-conclusao').textContent(), /25 pedidos.*22/);
    assert.equal(await page.locator('#a-salvar').textContent(), 'Guardar como cenário A');
    await page.locator('#promocao-detalhes > summary').click();
    await page.locator('#comparar-canais > summary').click();
    await page.locator('#canal-a-comissao_bps').fill('15');
    await page.locator('#canal-b-comissao_bps').fill('10');
    await page.locator('#canal-b-pagamento_bps').fill('2');
    await page.locator('#canal-b-frete_loja_centavos').fill('2');
    await page.locator('#canal-b-desconto_loja_centavos').fill('2');
    await page.getByRole('button', { name: 'Comparar canais' }).click();
    await page.waitForFunction(() => document.querySelector('#comparar-canais [role="status"]').textContent.includes('devem somar'));
    await page.locator('#canal-b-subsidio_plataforma_centavos').fill('3');
    await page.getByRole('button', { name: 'Comparar canais' }).click();
    await page.waitForFunction(() => document.querySelector('#comparar-canais [role="status"]').textContent.includes('27,72'));
    assert.match(await page.locator('#comparar-canais .alternativas-cartoes').textContent(), /207,00.*234,72/);
    const tamanhoOriginal = page.viewportSize();
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#consultar-regras-comerciais > summary').click();
    await page.getByRole('button', { name: 'Usar pergunta de exemplo' }).click();
    await page.getByRole('button', { name: 'Consultar fontes' }).click();
    await page.waitForSelector('#regras-comerciais-resultado a');
    assert.equal(await page.locator('#regras-comerciais-resultado a').count(), 4);
    assert.match(await page.locator('#regras-comerciais-resultado').textContent(), /24\/11\/2026.*Confira antes de calcular/);
    await page.locator('#pergunta-regras').fill('Como alterar minha senha?');
    await page.getByRole('button', { name: 'Consultar fontes' }).click();
    await page.waitForFunction(() => document.querySelector('#consultar-regras-comerciais [role="status"]').textContent.includes('Não encontrei'));
    assert.equal(await page.locator('#regras-comerciais-resultado a').count(), 0);
    const { violations: acessibilidadeCanais } = await new AxeBuilder({ page }).include('#comparar-canais').analyze();
    assert.deepEqual(acessibilidadeCanais.map(v => v.id), []);
    await page.locator('#comparar-canais > summary').click();
    await page.locator('#comparar-pico > summary').press('Enter');
    await page.getByRole('button', { name: 'Comparar com pico' }).press('Enter');
    const pico = page.locator('#comparar-pico');
    await pico.getByRole('heading', { name: 'No pico' }).waitFor();
    assert.match(await pico.getByRole('status').textContent(), /20 pedidos.*60 min/);
    assert.match(await pico.locator('.alternativas-cartoes').textContent(), /Ao longo do turno.*60 min.*No pico.*15 min/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const { violations: acessibilidadePico } = await new AxeBuilder({ page }).include('#comparar-pico').analyze();
    assert.deepEqual(acessibilidadePico.map(v => v.id), []);
    await pico.locator('summary').click();
    await page.setViewportSize(tamanhoOriginal);
    await page.getByRole('button', { name: 'Explicar este resultado' }).press('Enter');
    const origem = page.locator('.promocao-explicacao [role="status"]');
    await page.waitForFunction(() => /IA local desativada|gerada por IA local/.test(
      document.querySelector('.promocao-explicacao [role="status"]').textContent,
    ));
    assert.match(await origem.textContent(), /Explicação por regras|gerada por IA local/);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Explicar este resultado');
    assert.match(await page.locator('.promocao-explicacao p:not([role])').textContent(), /25 pedidos.*22/);

    await page.getByRole('button', { name: 'Testar desconto máximo' }).click();
    await page.waitForSelector('#promocao-resultado[data-desatualizado="false"]:not([hidden])');
    assert.equal(Number(await page.locator('#promocao-desconto').inputValue()), 0);
    await analisar();
    await page.locator('#promocao-detalhes > summary').click();
    await page.getByRole('button', { name: 'Testar outra equipe' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'promocao-pessoas_preparo');
    await analisar('5', '30');
    await page.locator('#promocao-detalhes > summary').click();
    await page.locator('#alternativa-custo').fill('20.10');
    await page.getByRole('button', { name: 'Comparar alternativas' }).click();
    await page.waitForFunction(() => document.querySelector('#comparar-alternativas [role="status"]').textContent.includes('empatam'));
    assert.match(await page.locator('.alternativas-cartoes').textContent(), /290,40.*310,50.*20,10.*290,40/);
    await page.getByRole('button', { name: 'Testar outra equipe' }).click();
    await page.locator('#promocao-pessoas_preparo').fill('3');
    await analisar('5', '30');
    assert.match(await page.locator('.promocao-conclusao').textContent(), /iguala ou supera/);
    assert.match(await page.locator('.promocao-alertas').textContent(), /custo adicional de pessoal/);
    assert.equal(await page.locator('#campo-pessoas_preparo').inputValue(), '2');
    await page.locator('#promocao-propria').click();
    assert.equal(await page.locator('#promocao-desconto').inputValue(), '0');
    assert.equal(await page.locator('#promocao-pessoas_preparo').inputValue(), '2');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [width, height] of [[320, 740], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto(url);
      await page.waitForSelector('#status[data-estado="atualizado"]');
      await page.locator('#testar-promocao').press('Enter');
      await page.waitForURL('**/#titulo-promocoes');
      await page.waitForSelector('.promocao-resumo');
      const painel = page.locator('.promocao-resumo');
      assert.match(await painel.textContent(), /25 pedidos.*22.*76,50/);
      const limite = await painel.boundingBox();
      assert.ok(limite.y >= 0 && limite.y + limite.height <= height,
        'Resumo cortado em ' + width + ' px: ' + JSON.stringify(limite));
      await page.screenshot({ path: 'tmp/rai-p0-promocao-' + width + '.png' });
      assert.equal(await page.locator('#promocao-ajustes').getAttribute('open'), null);
      assert.equal(await page.locator('#promocao-exemplo').getAttribute('aria-pressed'), 'true');
      assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY');
      console.log('OK: resumo completo na primeira tela em ' + width + '×' + height);
    }
    assert.deepEqual(erros, []);
    console.log('OK: demo, desconto máximo, equipe local, base compartilhada, preservação do simulador, validação e foco, hipóteses de volume, falha e recuperação, descarte de resposta antiga, edição de cenário e teclado');
  } finally { await browser.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
