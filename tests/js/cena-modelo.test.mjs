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

function estacao(alteracoes = {}) {
  return {
    pessoas: 2,
    tempo_por_pedido_min: 5,
    capacidade_teorica_turno: 24,
    capacidade_teorica_hora: 24,
    finalizados: 18,
    fila_final: 0,
    em_atendimento_final: 1,
    fila_maxima: 0,
    chegada_acima_do_ritmo: false,
    diagnostico: "sem_fila",
    ...alteracoes,
  };
}

function operacao(alteracoes = {}) {
  return {
    duracao_turno_min: 60,
    pedidos_recebidos: 20,
    pedidos_concluidos: 18,
    pedidos_pendentes: 2,
    estacoes: { preparo: estacao(), embalagem: estacao({ pessoas: 1 }) },
    ...alteracoes,
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

test("o modelo usa os valores do servidor, sem recalcular", () => {
  const modelo = criarModeloCena(
    operacao({
      pedidos_concluidos: 7,
      estacoes: {
        preparo: estacao({ pessoas: 3, em_atendimento_final: 2, fila_final: 5 }),
        embalagem: estacao({ pessoas: 1, em_atendimento_final: 1, fila_final: 4 }),
      },
    }),
  );

  assert.equal(modelo.duracao, 60);
  assert.equal(modelo.estacoes.preparo.fila.total, 5);
  assert.equal(modelo.estacoes.preparo.equipe.ocupadas, 2);
  assert.equal(modelo.estacoes.preparo.equipe.livres, 1);
  assert.equal(modelo.estacoes.embalagem.fila.total, 4);
  assert.equal(modelo.retirada.total, 7);
});

test("zero pedidos gera cena vazia, com a equipe ainda presente", () => {
  const modelo = criarModeloCena(
    operacao({
      pedidos_recebidos: 0,
      pedidos_concluidos: 0,
      pedidos_pendentes: 0,
      estacoes: {
        preparo: estacao({ em_atendimento_final: 0, finalizados: 0 }),
        embalagem: estacao({ pessoas: 1, em_atendimento_final: 0, finalizados: 0 }),
      },
    }),
  );
  const textos = textosDaCena(modelo, null).flatMap((rotulo) => rotulo.linhas);

  assert.equal(modelo.estacoes.preparo.fila.total, 0);
  assert.equal(modelo.retirada.total, 0);
  assert.equal(modelo.estacoes.preparo.equipe.livres, 2);
  assert.ok(textos.includes("Fila 0"));
  assert.ok(textos.includes("0 prontos"));
});

test("equipe grande é agrupada e soma exatamente o total", () => {
  const { equipe } = criarModeloCena(
    operacao({
      estacoes: {
        preparo: estacao({ pessoas: 50, em_atendimento_final: 48 }),
        embalagem: estacao({ pessoas: 1 }),
      },
    }),
  ).estacoes.preparo;

  assert.equal(equipe.total, 50);
  assert.equal(equipe.ocupadas, 48);
  assert.equal(equipe.livres, 2);
  assert.ok(equipe.ocupadasVisiveis + equipe.livresVisiveis <= LIMITE_PESSOAS);
  assert.equal(equipe.ocupadasVisiveis + equipe.livresVisiveis + equipe.agrupadas, 50);
  assert.ok(equipe.agrupadas > 0);
});

test("os rótulos mostram os totais exatos mesmo quando há agrupamento", () => {
  const modelo = criarModeloCena(
    operacao({
      pedidos_concluidos: 1000,
      estacoes: {
        preparo: estacao({ pessoas: 50, em_atendimento_final: 48, fila_final: 730 }),
        embalagem: estacao({ pessoas: 3, em_atendimento_final: 3, fila_final: 212 }),
      },
    }),
  );
  const textos = textosDaCena(modelo, null).flatMap((rotulo) => rotulo.linhas);

  assert.ok(textos.includes("Fila 730"));
  assert.ok(textos.includes("Fila 212"));
  assert.ok(textos.includes("Atend. 48/50"));
  assert.ok(textos.includes("Atend. 3/3"));
  assert.ok(textos.includes("1.000 prontos"));
});

test("a seleção e o gargalo aparecem em texto, não só em cor", () => {
  const modelo = criarModeloCena(
    operacao({
      estacoes: {
        preparo: estacao({ diagnostico: "gargalo_observado", fila_final: 9 }),
        embalagem: estacao({ pessoas: 1 }),
      },
    }),
  );
  const rotulos = textosDaCena(modelo, "embalagem");
  const preparo = rotulos.find((rotulo) => rotulo.ancora === "preparo");
  const embalagem = rotulos.find((rotulo) => rotulo.ancora === "embalagem");

  assert.ok(preparo.linhas.includes("Gargalo"));
  assert.equal(embalagem.linhas[0], "▶ Embalagem");
  assert.equal(preparo.linhas[0], "Preparo");
});

test("a descrição textual traz o momento e os totais", () => {
  const descricao = descreverCena(
    criarModeloCena(
      operacao({
        estacoes: {
          preparo: estacao({ pessoas: 3, em_atendimento_final: 2, fila_final: 5 }),
          embalagem: estacao({ pessoas: 1, em_atendimento_final: 1, fila_final: 4 }),
        },
      }),
    ),
  );

  assert.match(descricao, /fim do turno, minuto 60/);
  assert.match(descricao, /Preparo: 3 pessoas, 2 em atendimento, 5 na fila/);
  assert.match(descricao, /Embalagem: 1 pessoa, 1 em atendimento, 4 na fila/);
  assert.match(descricao, /Retirada: 18 pedidos prontos/);
});
