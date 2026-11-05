import assert from "node:assert/strict";
import { test } from "node:test";

import {
  alturaDaCena,
  criarTransformacao,
  desprojetar,
  ESTACOES_NA_CENA,
  posicionarRotulos,
  projetar,
  silhueta,
} from "../../src/simulador/web/js/cena/geometria.js";

const LARGURAS = [224, 273, 343, 600, 870, 1400];

function proximo(a, b, margem = 1e-9) {
  assert.ok(Math.abs(a - b) < margem, `${a} deveria ser próximo de ${b}`);
}

test("a projeção isométrica segue os eixos esperados", () => {
  assert.deepEqual(projetar({ x: 0, y: 0 }), { sx: 0, sy: 0 });
  // Andar em x vai para a direita e para baixo; em y, para a esquerda e para baixo.
  const emX = projetar({ x: 2, y: 0 });
  const emY = projetar({ x: 0, y: 2 });
  assert.ok(emX.sx > 0 && emX.sy > 0);
  assert.ok(emY.sx < 0 && emY.sy > 0);
  proximo(emX.sx, -emY.sx);
  proximo(emX.sy, emY.sy);
  // Subir em z só move na vertical.
  const alto = projetar({ x: 2, y: 0, z: 1 });
  proximo(alto.sx, emX.sx);
  proximo(alto.sy, emX.sy - 1);
});

test("desprojetar desfaz a projeção no piso", () => {
  for (const ponto of [{ x: 0, y: 0 }, { x: 3.5, y: 8.25 }, { x: 12, y: 1 }]) {
    const volta = desprojetar(projetar(ponto));
    proximo(volta.x, ponto.x);
    proximo(volta.y, ponto.y);
  }
});

test("a transformação de tela é reversível em qualquer tamanho", () => {
  for (const largura of LARGURAS) {
    const t = criarTransformacao(largura, alturaDaCena(largura));
    const tela = t.paraTela({ x: 5, y: 7 });
    const volta = t.daTela(tela);
    proximo(volta.x, 5);
    proximo(volta.y, 7);
  }
});

test("o piso inteiro cabe no quadro em qualquer tamanho", () => {
  for (const largura of LARGURAS) {
    const altura = alturaDaCena(largura);
    const t = criarTransformacao(largura, altura);
    for (const canto of [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 12 }, { x: 0, y: 12 }]) {
      const { px, py } = t.paraTela(canto);
      assert.ok(px >= 0 && px <= largura, `x fora em ${largura}: ${px}`);
      assert.ok(py >= 0 && py <= altura, `y fora em ${largura}: ${py}`);
    }
  }
});

test("redimensionar preserva as proporções da cena", () => {
  const medirRazao = (largura) => {
    const t = criarTransformacao(largura, alturaDaCena(largura));
    const direita = t.paraTela({ x: 12, y: 0 });
    const esquerda = t.paraTela({ x: 0, y: 12 });
    const baixo = t.paraTela({ x: 12, y: 12 });
    const topo = t.paraTela({ x: 0, y: 0 });
    return (direita.px - esquerda.px) / (baixo.py - topo.py);
  };

  const referencia = medirRazao(LARGURAS[0]);
  for (const largura of LARGURAS) {
    proximo(medirRazao(largura), referencia);
  }
});

test("a escala não diminui quando o quadro cresce", () => {
  const escalas = LARGURAS.map((l) => criarTransformacao(l, alturaDaCena(l)).escala);

  for (let i = 1; i < escalas.length; i += 1) {
    assert.ok(escalas[i] >= escalas[i - 1]);
  }
});

test("a altura do quadro respeita mínimo e máximo", () => {
  assert.equal(alturaDaCena(100), 210);
  assert.equal(alturaDaCena(5000), 430);
  assert.equal(alturaDaCena(500), 290);
});

test("as silhuetas das estações não se sobrepõem na tela", () => {
  const t = criarTransformacao(224, alturaDaCena(224));
  const limites = Object.values(ESTACOES_NA_CENA)
    .map((estacao) => {
      const pontos = silhueta(estacao, t).map((p) => p.px);
      return [Math.min(...pontos), Math.max(...pontos)];
    })
    .sort((a, b) => a[0] - b[0]);

  for (let i = 1; i < limites.length; i += 1) {
    assert.ok(limites[i][0] >= limites[i - 1][1], "silhuetas sobrepostas");
  }
});

function sobrepoe(a, b) {
  return (
    a.esquerda < b.esquerda + b.largura &&
    b.esquerda < a.esquerda + a.largura &&
    a.topo < b.topo + b.altura &&
    b.topo < a.topo + a.altura
  );
}

test("os rótulos cabem no quadro e não se sobrepõem, mesmo com números grandes", () => {
  const textos = [
    { ancora: "preparo", linhas: ["▶ Preparo", "Atend. 50/50", "Gargalo"] },
    { ancora: "embalagem", linhas: ["Embalagem", "Atend. 50/50", "Gargalo"] },
    { ancora: "fila_preparo", linhas: ["Fila 1.000"] },
    { ancora: "fila_embalagem", linhas: ["Fila 1.000"] },
    { ancora: "retirada", linhas: ["Retirada", "1.000 prontos"] },
  ];

  for (const largura of LARGURAS) {
    const altura = alturaDaCena(largura);
    const rotulos = posicionarRotulos(textos, criarTransformacao(largura, altura), largura, altura);

    for (const rotulo of rotulos) {
      assert.ok(rotulo.esquerda >= 0, `corte à esquerda em ${largura}`);
      assert.ok(rotulo.esquerda + rotulo.largura <= largura, `corte à direita em ${largura}`);
      assert.ok(rotulo.topo >= 0, `corte no topo em ${largura}`);
      assert.ok(rotulo.topo + rotulo.altura <= altura, `corte embaixo em ${largura}`);
    }
    for (let i = 0; i < rotulos.length; i += 1) {
      for (let j = i + 1; j < rotulos.length; j += 1) {
        assert.ok(
          !sobrepoe(rotulos[i], rotulos[j]),
          `sobreposição em ${largura}: ${rotulos[i].ancora} e ${rotulos[j].ancora}`,
        );
      }
    }
  }
});
