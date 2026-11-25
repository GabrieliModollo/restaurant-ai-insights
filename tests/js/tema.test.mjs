import assert from "node:assert/strict";
import { test } from "node:test";

import { aplicarTema, CHAVE, lerTema, normalizarTema, salvarTema } from "../../src/simulador/web/js/tema.js";

function memoria(inicial = {}) {
  const dados = { ...inicial };
  return { getItem: chave => dados[chave] ?? null, setItem: (chave, valor) => { dados[chave] = valor; }, dados };
}

test("o tema padrão é o claro", () => {
  assert.equal(lerTema(memoria()), "claro");
  assert.equal(lerTema(null), "claro");
  assert.equal(normalizarTema("qualquer"), "claro");
});

test("lembra o tema noturno escolhido", () => {
  const armazenamento = memoria();
  salvarTema(armazenamento, "noturno");
  assert.equal(armazenamento.dados[CHAVE], "noturno");
  assert.equal(lerTema(armazenamento), "noturno");
});

test("armazenamento bloqueado não quebra a página", () => {
  const bloqueado = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  assert.equal(lerTema(bloqueado), "claro");
  assert.doesNotThrow(() => salvarTema(bloqueado, "noturno"));
});

test("aplica e remove o atributo do tema noturno", () => {
  const raiz = { dataset: {} };
  aplicarTema(raiz, "noturno");
  assert.equal(raiz.dataset.tema, "noturno");
  aplicarTema(raiz, "claro");
  assert.equal("tema" in raiz.dataset, false);
});
