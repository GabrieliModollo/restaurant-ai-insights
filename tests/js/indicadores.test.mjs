import assert from "node:assert/strict";
import { test } from "node:test";

import { textoMedia } from "../../src/simulador/web/js/indicadores.js";

test("média ausente é explicada, e não mostrada como zero", () => {
  assert.equal(textoMedia(null), "Sem pedidos concluídos");
});

test("média igual a zero continua sendo um valor real", () => {
  assert.equal(textoMedia(0), "0 min");
});

test("média com casas decimais usa o formato brasileiro", () => {
  assert.equal(textoMedia(7.25), "7,25 min");
});
