import assert from "node:assert/strict";
import { test } from "node:test";

import { estacaoEm, pontoNoPoligono } from "../../src/simulador/web/js/cena/deteccao.js";
import {
  alturaDaCena,
  criarTransformacao,
  ESTACOES_NA_CENA,
  silhueta,
} from "../../src/simulador/web/js/cena/geometria.js";

const LARGURAS = [224, 343, 870, 1400];

function transformacao(largura) {
  return criarTransformacao(largura, alturaDaCena(largura));
}

function centroDaEstacao(nome, t) {
  const { x, y } = ESTACOES_NA_CENA[nome].centro;
  return t.paraTela({ x, y });
}

test("ponto dentro e fora de um polígono", () => {
  const quadrado = [
    { px: 0, py: 0 },
    { px: 10, py: 0 },
    { px: 10, py: 10 },
    { px: 0, py: 10 },
  ];

  assert.equal(pontoNoPoligono({ px: 5, py: 5 }, quadrado), true);
  assert.equal(pontoNoPoligono({ px: 11, py: 5 }, quadrado), false);
  assert.equal(pontoNoPoligono({ px: 5, py: -1 }, quadrado), false);
});

test("clicar no centro de cada estação a seleciona, em qualquer tamanho", () => {
  for (const largura of LARGURAS) {
    const t = transformacao(largura);

    assert.equal(estacaoEm(centroDaEstacao("preparo", t), t), "preparo");
    assert.equal(estacaoEm(centroDaEstacao("embalagem", t), t), "embalagem");
  }
});

test("clicar no topo do bloco também conta como dentro da estação", () => {
  const t = transformacao(870);
  const { centro, altura } = ESTACOES_NA_CENA.preparo;

  const topo = t.paraTela({ x: centro.x, y: centro.y, z: altura });

  assert.equal(estacaoEm(topo, t), "preparo");
});

test("clicar fora das estações não seleciona nada", () => {
  for (const largura of LARGURAS) {
    const t = transformacao(largura);
    const altura = alturaDaCena(largura);

    assert.equal(estacaoEm({ px: 1, py: 1 }, t), null);
    assert.equal(estacaoEm({ px: largura - 1, py: altura - 1 }, t), null);
    // O meio do quadro fica entre as duas estações, na fila da embalagem.
    assert.equal(estacaoEm(t.paraTela(ESTACOES_NA_CENA.fila_embalagem.centro), t), null);
  }
});

test("a retirada não é selecionável", () => {
  for (const largura of LARGURAS) {
    const t = transformacao(largura);

    assert.equal(estacaoEm(centroDaEstacao("retirada", t), t), null);
  }
});

test("a área de clique acompanha a escala: o mesmo ponto do piso dá o mesmo resultado", () => {
  const pontoDoPiso = {
    x: ESTACOES_NA_CENA.embalagem.centro.x + 0.5,
    y: ESTACOES_NA_CENA.embalagem.centro.y - 0.5,
  };

  for (const largura of LARGURAS) {
    const t = transformacao(largura);

    assert.equal(estacaoEm(t.paraTela(pontoDoPiso), t), "embalagem");
  }
});

test("em quadro pequeno, a área de clique tem um tamanho mínimo", () => {
  const t = transformacao(224);
  const centro = centroDaEstacao("preparo", t);

  // Abaixo do centro, fora do bloco desenhado, mas dentro do alcance de um dedo.
  const ponto = { px: centro.px, py: centro.py + 20 };

  assert.equal(pontoNoPoligono(ponto, silhueta(ESTACOES_NA_CENA.preparo, t)), false);
  assert.equal(estacaoEm(ponto, t), "preparo");
});
