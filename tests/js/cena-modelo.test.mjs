import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agrupar,
  criarModeloCena,
  descreverCena,
  LIMITE_ITENS,
  LIMITE_PESSOAS,
  textosDaCena,
} from "../../src/simulador/web/js/cena/modelo.js";

function operacao(preparo = {}, embalagem = {}) {
  return {
    duracao_turno_min: 60,
    estacoes: {
      preparo: { pessoas: 2, diagnostico: "sem_fila", ...preparo },
      embalagem: { pessoas: 1, diagnostico: "sem_fila", ...embalagem },
    },
  };
}

function momento({ filaP = 0, filaE = 0, atendeP = 0, atendeE = 0, prontos = 0 } = {}) {
  return {
    chegados: filaP + filaE + atendeP + atendeE + prontos,
    fila: { preparo: filaP, embalagem: filaE },
    atendendo: { preparo: atendeP, embalagem: atendeE },
    finalizados: { preparo: prontos + filaE + atendeE, embalagem: prontos },
  };
}

test("poucos itens são desenhados um a um", () => {
  assert.deepEqual(agrupar(3, 9), { total: 3, individuais: 3, agrupados: 0 });
  assert.deepEqual(agrupar(9, 9), { total: 9, individuais: 9, agrupados: 0 });
  assert.deepEqual(agrupar(0, 9), { total: 0, individuais: 0, agrupados: 0 });
});

test("muitos itens viram uma pilha, sem perder o total", () => {
  assert.deepEqual(agrupar(10, 9), { total: 10, individuais: 8, agrupados: 2 });

  for (const total of [10, 37, 500, 1000]) {
    const grupo = agrupar(total, LIMITE_ITENS);

    assert.equal(grupo.individuais + grupo.agrupados, total);
    assert.ok(grupo.individuais < LIMITE_ITENS);
  }
});

test("o modelo mostra o momento do relógio, e a equipe vem do cenário", () => {
  const modelo = criarModeloCena(
    operacao({ pessoas: 3 }),
    momento({ filaP: 5, atendeP: 2, filaE: 4, atendeE: 1, prontos: 7 }),
    12,
  );

  assert.equal(modelo.minuto, 12);
  assert.equal(modelo.duracao, 60);
  assert.equal(modelo.ehFim, false);
  assert.equal(modelo.estacoes.preparo.fila.total, 5);
  assert.equal(modelo.estacoes.preparo.equipe.ocupadas, 2);
  assert.equal(modelo.estacoes.preparo.equipe.livres, 1);
  assert.equal(modelo.estacoes.embalagem.fila.total, 4);
  assert.equal(modelo.retirada.total, 7);
});

test("zero pedidos gera cena vazia, com a equipe ainda presente", () => {
  const modelo = criarModeloCena(operacao(), momento(), 60);
  const textos = textosDaCena(modelo, null).flatMap((rotulo) => rotulo.linhas);

  assert.equal(modelo.estacoes.preparo.fila.total, 0);
  assert.equal(modelo.retirada.total, 0);
  assert.equal(modelo.estacoes.preparo.equipe.livres, 2);
  assert.ok(textos.includes("Fila 0"));
  assert.ok(textos.includes("0 pedidos"));
});

test("equipe grande é agrupada e soma exatamente o total", () => {
  const { equipe } = criarModeloCena(
    operacao({ pessoas: 50 }),
    momento({ atendeP: 48 }),
    60,
  ).estacoes.preparo;

  assert.equal(equipe.total, 50);
  assert.equal(equipe.ocupadas, 48);
  assert.equal(equipe.livres, 2);
  assert.ok(equipe.ocupadasVisiveis + equipe.livresVisiveis <= LIMITE_PESSOAS);
  assert.equal(equipe.ocupadasVisiveis + equipe.livresVisiveis + equipe.agrupadas, 50);
  assert.ok(equipe.agrupadas > 0);
});

test("os rótulos usam linguagem clara e mostram os totais exatos", () => {
  const modelo = criarModeloCena(
    operacao({ pessoas: 50 }, { pessoas: 3 }),
    momento({ filaP: 730, atendeP: 48, filaE: 212, atendeE: 3, prontos: 1000 }),
    60,
  );
  const textos = textosDaCena(modelo, null);
  const linhas = textos.flatMap((rotulo) => rotulo.linhas);

  assert.ok(linhas.includes("Fila 730"));
  assert.ok(linhas.includes("Fila 212"));
  assert.deepEqual(textos.find((r) => r.ancora === "preparo").linhas.slice(0, 4), [
    "Preparo",
    "48 de 50",
    "pessoas",
    "preparando",
  ]);
  assert.deepEqual(textos.find((r) => r.ancora === "embalagem").linhas.slice(0, 4), [
    "Embalagem",
    "3 de 3",
    "pessoas",
    "embalando",
  ]);
  assert.deepEqual(textos.find((r) => r.ancora === "retirada").linhas, [
    "1.000 pedidos",
    "prontos para",
    "retirada",
  ]);
  assert.ok(!linhas.some((linha) => linha.includes("Atend.")));
});

test("uma só pessoa na estação aparece no singular", () => {
  const textos = textosDaCena(criarModeloCena(operacao(), momento({ atendeE: 1 }), 30), null);

  assert.deepEqual(textos.find((r) => r.ancora === "embalagem").linhas, [
    "Embalagem",
    "1 de 1",
    "pessoa",
    "embalando",
  ]);
});

test("a seleção aparece em texto, não só em cor", () => {
  const textos = textosDaCena(criarModeloCena(operacao(), momento(), 60), "embalagem");

  assert.equal(textos.find((r) => r.ancora === "embalagem").linhas[0], "▶ Embalagem");
  assert.equal(textos.find((r) => r.ancora === "preparo").linhas[0], "Preparo");
});

test("o gargalo, que é um diagnóstico do turno completo, só aparece no fim", () => {
  const dados = operacao({ diagnostico: "gargalo_observado" });
  const linhasNo = (minuto) =>
    textosDaCena(criarModeloCena(dados, momento({ filaP: 9 }), minuto), null).find(
      (r) => r.ancora === "preparo",
    ).linhas;

  assert.ok(!linhasNo(30).includes("Gargalo"));
  assert.ok(linhasNo(60).includes("Gargalo"));
});

test("a descrição textual informa o momento e os totais dele", () => {
  const dados = operacao({ pessoas: 3 });
  const estado = momento({ filaP: 5, atendeP: 2, filaE: 4, atendeE: 1, prontos: 18 });

  const noMeio = descreverCena(criarModeloCena(dados, estado, 12.34));
  assert.match(noMeio, /Restaurante no minuto 12,3 de 60/);
  assert.match(noMeio, /Preparo: 3 pessoas, 2 preparando, 5 na fila/);
  assert.match(noMeio, /Embalagem: 1 pessoa, 1 embalando, 4 na fila/);
  assert.match(noMeio, /Retirada: 18 pedidos prontos para retirada/);

  const noFim = descreverCena(criarModeloCena(dados, estado, 60));
  assert.match(noFim, /Restaurante ao fim do turno, minuto 60/);
});
