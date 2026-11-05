import assert from "node:assert/strict";
import { test } from "node:test";

import { textoLimites, validarCampo } from "../../src/simulador/web/js/formulario.js";

const preco = { nome: "preco_venda", rotulo: "Preço de venda", unidade: "R$", minimo: 0.01, maximo: 1000, casas: 2 };
const desconto = { ...preco, nome: "desconto", rotulo: "Desconto", minimo: 0, maximo_campo: "preco_venda" };
const pedidos = { nome: "pedidos", rotulo: "Pedidos", unidade: "pedidos", minimo: 0, maximo: 1000, casas: 0 };
const taxa = { nome: "taxa", rotulo: "Taxa", unidade: "%", minimo: 0, maximo: 100, casas: 2 };

test("os limites aparecem com a unidade de cada campo", () => {
  assert.equal(textoLimites(preco), "Limites: R$ 0,01 a R$ 1.000");
  assert.equal(textoLimites(taxa), "Limites: 0% a 100%");
  assert.equal(textoLimites(pedidos), "Limites: 0 a 1.000 pedidos");
});

test("um limite que depende de outro campo cita esse campo", () => {
  assert.equal(textoLimites(desconto, "Preço de venda"), "Limites: R$ 0 até o preço de venda");
});

test("valores dentro dos limites não geram erro", () => {
  assert.equal(validarCampo(preco, "0.01", {}), null);
  assert.equal(validarCampo(preco, "1000", {}), null);
  assert.equal(validarCampo(pedidos, "0", {}), null);
  assert.equal(validarCampo(desconto, "20", { preco_venda: 20 }), null);
});

test("cada entrada inválida recebe uma mensagem compreensível", () => {
  assert.equal(validarCampo(preco, "", {}), "Informe um número.");
  assert.equal(validarCampo(preco, "0", {}), "Use um valor entre 0,01 e 1.000.");
  assert.equal(validarCampo(pedidos, "1.5", {}), "Use um número inteiro.");
  assert.equal(validarCampo(preco, "1.234", {}), "Use no máximo 2 casas decimais.");
  assert.equal(
    validarCampo(desconto, "20.01", { preco_venda: 20 }),
    "O desconto não pode ser maior que o preço.",
  );
});
