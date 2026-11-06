import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { linhasDaPromocao, textosDoEquilibrio } from "../../src/simulador/web/js/promocoes.js";
import { analisarPromocao, ErroDeValidacao, ErroDoServidor } from "../../src/simulador/web/js/api.js";

const fetchOriginal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchOriginal; });

const cenario = {
  preco_original_centavos: 3500, desconto_centavos: 0, desconto_pct: 0,
  preco_liquido_centavos: 3500, taxa_canal_centavos: 525, taxa_canal_pct: 15,
  custo_ingredientes_centavos: 1200, custo_embalagem_centavos: 200,
  contribuicao_por_pedido_centavos: 1575, pedidos_recebidos: 20,
  pedidos_concluidos: 18, contribuicao_total_centavos: 28350,
};
function dados() {
  return {
    base: { ...cenario }, promocional: { ...cenario, desconto_centavos: 500, desconto_pct: 100 / 7 },
    diferencas: Object.fromEntries(Object.keys(cenario).map(chave => [chave, { absoluta: 0, percentual: 0 }])),
    equilibrio: { pedidos_concluidos_minimos: 25, pedidos_concluidos_maximos: null, adicionais_sobre_base: 7 },
  };
}

test("tabela diferencia pedidos recebidos e concluídos e exibe taxa e desconto", () => {
  const linhas = linhasDaPromocao(dados());
  assert.equal(linhas.length, 10);
  assert.ok(linhas.some(l => l.rotulo === "Pedidos recebidos (hipótese)" && l.base === "20"));
  assert.ok(linhas.some(l => l.rotulo === "Pedidos concluídos no turno" && l.base === "18"));
  assert.match(linhas.find(l => l.rotulo === "Desconto por pedido").promocao, /5,00.*14,29%/);
  assert.match(linhas.find(l => l.rotulo === "Taxa do canal por pedido").base, /5,25.*15%/);
});

test("percentual indefinido e diferença negativa continuam explícitos", () => {
  const d = dados();
  d.diferencas.contribuicao_total_centavos = { absoluta: -7650, percentual: null };
  const linha = linhasDaPromocao(d).find(l => l.rotulo === "Contribuição total");
  assert.match(linha.diferenca, /-.*76,50/);
  assert.equal(linha.percentual, "Não definido (base zero)");
});

test("metas são exibidas a partir da API, sem transformar recebidos em conclusões", () => {
  const t = textosDoEquilibrio(dados());
  assert.equal(t.minimo, "25 concluídos");
  assert.equal(t.adicionais, "7 concluídos a mais");
  assert.equal(t.intervalo, null);
});

test("meta impossível e base negativa não viram promessa de crescimento", () => {
  const d = dados();
  d.equilibrio.pedidos_concluidos_minimos = null;
  d.equilibrio.adicionais_sobre_base = null;
  assert.equal(textosDoEquilibrio(d).minimo, "Sem volume que compense");
  assert.equal(textosDoEquilibrio(d).adicionais, "Não se aplica");
  d.equilibrio.pedidos_concluidos_minimos = 0;
  d.equilibrio.pedidos_concluidos_maximos = 0;
  assert.match(textosDoEquilibrio(d).intervalo, /no máximo 0.*Mais pedidos pioram/);
});

test("API de promoções envia ambos os cenários ao endpoint novo", async () => {
  const corpo = { base: { pedidos: 20 }, promocional: { pedidos: 40 } };
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(url, "/api/promocoes");
    assert.equal(opcoes.method, "POST");
    assert.deepEqual(JSON.parse(opcoes.body), corpo);
    return new Response('{"equilibrio":{}}', { status: 200 });
  };
  assert.deepEqual(await analisarPromocao(corpo), { equilibrio: {} });
});

test("erro qualificado da promoção mantém o contrato de validação", async () => {
  globalThis.fetch = async () => new Response('{"erros":{"promocional.desconto":"Inválido."}}', { status: 422 });
  await assert.rejects(analisarPromocao({}), erro => erro instanceof ErroDeValidacao && erro.erros["promocional.desconto"] === "Inválido.");
});

test("erro do servidor e cancelamento da análise são preservados", async () => {
  globalThis.fetch = async () => new Response('{}', { status: 500 });
  await assert.rejects(analisarPromocao({}), ErroDoServidor);
  const controle = new AbortController(); controle.abort();
  globalThis.fetch = async (_, { signal }) => { signal.throwIfAborted(); };
  await assert.rejects(analisarPromocao({}, controle.signal), { name: "AbortError" });
});
