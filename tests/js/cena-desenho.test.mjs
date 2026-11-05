import assert from "node:assert/strict";
import { test } from "node:test";

import { desenharCena } from "../../src/simulador/web/js/cena/desenho.js";
import { alturaDaCena, criarTransformacao } from "../../src/simulador/web/js/cena/geometria.js";
import { criarModeloCena } from "../../src/simulador/web/js/cena/modelo.js";

const CORES = new Proxy({}, { get: () => "#123456" });

// Contexto falso: registra os textos e conta os desenhos, sem depender de um navegador.
function criarContexto() {
  const textos = [];
  let preenchimentos = 0;
  const contexto = new Proxy(
    {
      fillText: (texto) => textos.push(texto),
      fill: () => {
        preenchimentos += 1;
      },
      measureText: (texto) => ({ width: texto.length * 6 }),
    },
    {
      get: (alvo, nome) => alvo[nome] ?? (() => {}),
      set: (alvo, nome, valor) => {
        alvo[nome] = valor;
        return true;
      },
    },
  );
  return { contexto, textos, preenchimentos: () => preenchimentos };
}

function desenhar(operacao, opcoes = {}) {
  const largura = opcoes.largura ?? 600;
  const altura = alturaDaCena(largura);
  const registro = criarContexto();
  desenharCena(registro.contexto, {
    modelo: criarModeloCena(operacao),
    transformacao: criarTransformacao(largura, altura),
    largura,
    altura,
    selecionada: opcoes.selecionada ?? null,
    desatualizada: opcoes.desatualizada ?? false,
    cores: CORES,
  });
  return registro;
}

function estacao(alteracoes = {}) {
  return {
    pessoas: 2,
    fila_final: 0,
    em_atendimento_final: 1,
    diagnostico: "sem_fila",
    ...alteracoes,
  };
}

function operacao(alteracoes = {}) {
  return {
    duracao_turno_min: 60,
    pedidos_concluidos: 18,
    estacoes: { preparo: estacao(), embalagem: estacao({ pessoas: 1 }) },
    ...alteracoes,
  };
}

test("a cena avisa que representa o fim do turno", () => {
  const { textos } = desenhar(operacao());

  assert.ok(textos.includes("Fim do turno · minuto 60"));
});

test("uma cena antiga é identificada no próprio desenho", () => {
  const { textos } = desenhar(operacao(), { desatualizada: true });

  assert.ok(textos.includes("Último cenário válido"));
});

test("os totais do servidor aparecem escritos", () => {
  const { textos } = desenhar(
    operacao({
      pedidos_concluidos: 321,
      estacoes: {
        preparo: estacao({ pessoas: 50, em_atendimento_final: 50, fila_final: 640 }),
        embalagem: estacao({ pessoas: 1, fila_final: 39 }),
      },
    }),
  );

  assert.ok(textos.includes("Fila 640"));
  assert.ok(textos.includes("Fila 39"));
  assert.ok(textos.includes("Atend. 50/50"));
  assert.ok(textos.includes("321 prontos"));
});

test("muitos pedidos não fazem o número de desenhos crescer sem limite", () => {
  const poucos = desenhar(
    operacao({
      pedidos_concluidos: 12,
      estacoes: {
        preparo: estacao({ pessoas: 50, em_atendimento_final: 50, fila_final: 12 }),
        embalagem: estacao({ pessoas: 50, em_atendimento_final: 50, fila_final: 12 }),
      },
    }),
  );
  const muitos = desenhar(
    operacao({
      pedidos_concluidos: 1000,
      estacoes: {
        preparo: estacao({ pessoas: 50, em_atendimento_final: 50, fila_final: 1000 }),
        embalagem: estacao({ pessoas: 50, em_atendimento_final: 50, fila_final: 1000 }),
      },
    }),
  );

  assert.equal(muitos.preenchimentos(), poucos.preenchimentos());
});

test("zero pedidos também é desenhado", () => {
  const { textos } = desenhar(
    operacao({
      pedidos_concluidos: 0,
      estacoes: {
        preparo: estacao({ em_atendimento_final: 0 }),
        embalagem: estacao({ pessoas: 1, em_atendimento_final: 0 }),
      },
    }),
  );

  assert.ok(textos.includes("0 prontos"));
  assert.ok(textos.includes("Atend. 0/2"));
});

test("desenha em quadro pequeno e com estação selecionada", () => {
  const { textos } = desenhar(operacao(), { largura: 224, selecionada: "preparo" });

  assert.ok(textos.includes("▶ Preparo"));
});
