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

function operacao(pessoasP = 2, pessoasE = 1) {
  return {
    duracao_turno_min: 60,
    estacoes: {
      preparo: { pessoas: pessoasP, diagnostico: "sem_fila" },
      embalagem: { pessoas: pessoasE, diagnostico: "sem_fila" },
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

function desenhar(dados, estado, minuto, opcoes = {}) {
  const largura = opcoes.largura ?? 600;
  const altura = alturaDaCena(largura);
  const registro = criarContexto();
  desenharCena(registro.contexto, {
    modelo: criarModeloCena(dados, estado, minuto),
    transformacao: criarTransformacao(largura, altura),
    largura,
    altura,
    selecionada: opcoes.selecionada ?? null,
    desatualizada: opcoes.desatualizada ?? false,
    cores: CORES,
  });
  return registro;
}

test("a cena informa o minuto mostrado", () => {
  assert.ok(desenhar(operacao(), momento(), 12.7).textos.includes("Minuto 12 de 60"));
});

test("no fim, a cena avisa que representa o fim do turno", () => {
  assert.ok(desenhar(operacao(), momento(), 60).textos.includes("Fim do turno · minuto 60"));
});

test("uma cena antiga é identificada no próprio desenho", () => {
  const { textos } = desenhar(operacao(), momento(), 60, { desatualizada: true });

  assert.ok(textos.includes("Último cenário válido"));
});

test("os totais do momento aparecem escritos", () => {
  const { textos } = desenhar(
    operacao(50),
    momento({ filaP: 640, atendeP: 50, filaE: 39, prontos: 321 }),
    60,
  );

  assert.ok(textos.includes("Fila 640"));
  assert.ok(textos.includes("Fila 39"));
  assert.ok(textos.includes("50 de 50"));
  assert.ok(textos.includes("321 pedidos"));
});

test("muitos pedidos não fazem o número de desenhos crescer sem limite", () => {
  const poucos = desenhar(
    operacao(50, 50),
    momento({ filaP: 12, filaE: 12, atendeP: 50, atendeE: 50, prontos: 12 }),
    60,
  );
  const muitos = desenhar(
    operacao(50, 50),
    momento({ filaP: 1000, filaE: 1000, atendeP: 50, atendeE: 50, prontos: 1000 }),
    60,
  );

  assert.equal(muitos.preenchimentos(), poucos.preenchimentos());
});

test("zero pedidos também é desenhado", () => {
  const { textos } = desenhar(operacao(), momento(), 60);

  assert.ok(textos.includes("0 pedidos"));
  assert.ok(textos.includes("0 de 2"));
});

test("desenha em quadro pequeno e com estação selecionada", () => {
  const { textos } = desenhar(operacao(), momento(), 60, { largura: 224, selecionada: "preparo" });

  assert.ok(textos.includes("▶ Preparo"));
});
