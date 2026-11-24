import assert from "node:assert/strict";
import { test } from "node:test";

import { descreverOrigem, EXEMPLOS } from "../../src/simulador/web/js/assistente.js";

test("identifica quando a IA local interpretou a pergunta", () => {
  assert.equal(descreverOrigem({ origem: "ia_local", modelo: "qwen2.5:1.5b" }), "Interpretado por IA local · qwen2.5:1.5b");
});

test("explica por que as regras assumiram", () => {
  assert.match(descreverOrigem({ origem: "regras", motivo: "desativada" }), /IA local desativada/);
  assert.match(descreverOrigem({ origem: "regras", motivo: "indisponivel" }), /Ollama indisponível/);
  assert.match(descreverOrigem({ origem: "regras", motivo: "numero_nao_citado" }), /não estava na pergunta/);
  assert.equal(descreverOrigem({ origem: "regras", motivo: "outro" }), "Interpretado por regras");
});

test("os exemplos cobrem promoção, equipe, volume e regras comerciais", () => {
  assert.equal(EXEMPLOS.length, 4);
  assert.ok(EXEMPLOS.some(exemplo => /desconto de R\$ 5/.test(exemplo)));
  assert.ok(EXEMPLOS.some(exemplo => /iFood/.test(exemplo)));
});
