import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { criarLinhaDoTempo } from "../../src/simulador/web/js/cena/linha-do-tempo.js";

const CENARIOS = JSON.parse(
  readFileSync(new URL("../fixtures/simulacoes.json", import.meta.url), "utf-8"),
);

function linhaDo(nome) {
  const { operacao } = CENARIOS[nome];
  return { operacao, linha: criarLinhaDoTempo(operacao.eventos, operacao.duracao_turno_min) };
}

for (const nome of Object.keys(CENARIOS)) {
  test(`${nome}: ao terminar, os totais reconstruídos coincidem com os da API`, () => {
    const { operacao, linha } = linhaDo(nome);
    const estado = linha.estadoEm(operacao.duracao_turno_min);
    const { preparo, embalagem } = operacao.estacoes;

    assert.equal(estado.finalizados.embalagem, operacao.pedidos_concluidos);
    assert.deepEqual(
      {
        fila_preparo: estado.fila.preparo,
        em_preparo: estado.atendendo.preparo,
        fila_embalagem: estado.fila.embalagem,
        em_embalagem: estado.atendendo.embalagem,
      },
      operacao.pendentes,
    );
    assert.equal(estado.finalizados.preparo, preparo.finalizados);
    assert.equal(estado.finalizados.embalagem, embalagem.finalizados);
    assert.equal(estado.chegados, operacao.pedidos_recebidos);
  });

  test(`${nome}: em todo instante, cada pedido que chegou está em um único lugar`, () => {
    const { linha } = linhaDo(nome);

    for (const instante of linha.instantes) {
      const e = linha.estadoEm(instante);
      assert.equal(
        e.fila.preparo +
          e.atendendo.preparo +
          e.fila.embalagem +
          e.atendendo.embalagem +
          e.finalizados.embalagem,
        e.chegados,
      );
      assert.ok(e.fila.preparo >= 0 && e.fila.embalagem >= 0);
      assert.ok(e.atendendo.preparo >= 0 && e.atendendo.embalagem >= 0);
    }
  });
}

test("estados em instantes conhecidos, conferidos à mão", () => {
  // Chegadas nos minutos 0, 1, 2 e 3. Uma pessoa em cada estação; preparo de 2 min e embalagem de 1.
  const { linha } = linhaDo("eventos_simultaneos");

  // Minuto 0: o 1º chega e começa o preparo.
  assert.deepEqual(linha.estadoEm(0), {
    chegados: 1,
    fila: { preparo: 0, embalagem: 0 },
    atendendo: { preparo: 1, embalagem: 0 },
    finalizados: { preparo: 0, embalagem: 0 },
  });
  // Minuto 1: o 2º chega e espera.
  assert.deepEqual(linha.estadoEm(1).fila, { preparo: 1, embalagem: 0 });
  // Minuto 2: o 1º vai para a embalagem, o 2º começa o preparo e o 3º chega e espera.
  assert.deepEqual(linha.estadoEm(2), {
    chegados: 3,
    fila: { preparo: 1, embalagem: 0 },
    atendendo: { preparo: 1, embalagem: 1 },
    finalizados: { preparo: 1, embalagem: 0 },
  });
  // Minuto 3: o 1º fica pronto.
  assert.equal(linha.estadoEm(3).finalizados.embalagem, 1);
});

test("entre dois eventos, o estado continua sendo o do último evento", () => {
  const { linha } = linhaDo("eventos_simultaneos");

  assert.deepEqual(linha.estadoEm(1.5), linha.estadoEm(1));
  assert.deepEqual(linha.estadoEm(2.99), linha.estadoEm(2));
});

test("eventos simultâneos são aplicados juntos, sem estado intermediário", () => {
  const eventos = [
    { minuto: 2, tipo: "fim_preparo", pedido: 1, estacao: "preparo", posto: 1 },
    { minuto: 2, tipo: "chegada", pedido: 3, estacao: null, posto: null },
    { minuto: 2, tipo: "inicio_embalagem", pedido: 1, estacao: "embalagem", posto: 1 },
  ];
  const anteriores = [
    { minuto: 0, tipo: "chegada", pedido: 1, estacao: null, posto: null },
    { minuto: 0, tipo: "inicio_preparo", pedido: 1, estacao: "preparo", posto: 1 },
  ];

  const linha = criarLinhaDoTempo([...anteriores, ...eventos], 10);

  assert.deepEqual(linha.instantes, [0, 2]);
  assert.deepEqual(linha.estadoEm(2), {
    chegados: 2,
    fila: { preparo: 1, embalagem: 0 },
    atendendo: { preparo: 0, embalagem: 1 },
    finalizados: { preparo: 1, embalagem: 0 },
  });
});

test("zero pedidos: o estado é vazio em qualquer instante", () => {
  const { linha } = linhaDo("sem_pedidos");
  const vazio = {
    chegados: 0,
    fila: { preparo: 0, embalagem: 0 },
    atendendo: { preparo: 0, embalagem: 0 },
    finalizados: { preparo: 0, embalagem: 0 },
  };

  assert.deepEqual(linha.estadoEm(0), vazio);
  assert.deepEqual(linha.estadoEm(60), vazio);
  assert.equal(linha.proximoInstante(0), 60);
  assert.equal(linha.instanteAnterior(60), 0);
});

test("pedido que termina exatamente no fim do turno aparece como pronto só no fim", () => {
  const { linha } = linhaDo("fim_exato");

  assert.equal(linha.estadoEm(59.99).finalizados.embalagem, 0);
  assert.equal(linha.estadoEm(60).finalizados.embalagem, 1);
});

test("avançar e voltar por etapas percorre os instantes com eventos", () => {
  const { linha } = linhaDo("eventos_simultaneos");

  assert.equal(linha.proximoInstante(0), 1);
  assert.equal(linha.proximoInstante(0.5), 1);
  assert.equal(linha.instanteAnterior(2), 1);
  assert.equal(linha.instanteAnterior(1.5), 1);
  // Antes do primeiro e depois do último, os limites são o início e o fim do turno.
  assert.equal(linha.instanteAnterior(0), 0);
  assert.equal(linha.proximoInstante(4), 4);
});
