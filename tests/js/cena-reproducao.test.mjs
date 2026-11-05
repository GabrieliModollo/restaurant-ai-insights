import assert from "node:assert/strict";
import { test } from "node:test";

import { criarReproducao, SEGUNDOS_DO_TURNO } from "../../src/simulador/web/js/cena/reproducao.js";

// Agendador falso: guarda o próximo quadro, e o teste decide quando ele acontece.
function criarCenario(duracao = 60) {
  const fila = [];
  let cancelados = 0;
  const atualizacoes = [];
  const reproducao = criarReproducao({
    agendar: (funcao) => {
      fila.push(funcao);
      return fila.length;
    },
    cancelar: () => {
      cancelados += 1;
      fila.length = 0;
    },
    aoAtualizar: (estado) => atualizacoes.push(estado),
  });
  reproducao.carregar(duracao);
  atualizacoes.length = 0;

  return {
    reproducao,
    atualizacoes,
    pendentes: () => fila.length,
    cancelados: () => cancelados,
    quadro: (agora) => fila.shift()?.(agora),
  };
}

test("carregar deixa parado no início, sem agendar nada", () => {
  const { reproducao, pendentes } = criarCenario();

  assert.equal(reproducao.minuto, 0);
  assert.equal(reproducao.tocando, false);
  assert.equal(pendentes(), 0);
});

test("o turno inteiro leva o tempo definido na velocidade 1x", () => {
  const { reproducao, quadro } = criarCenario(60);

  reproducao.iniciar();
  quadro(0);
  for (let t = 100; t <= SEGUNDOS_DO_TURNO * 1000; t += 100) {
    quadro(t);
  }

  assert.equal(reproducao.minuto, 60);
  assert.equal(reproducao.tocando, false);
});

test("a velocidade altera o avanço do relógio", () => {
  const medir = (velocidade) => {
    const { reproducao, quadro } = criarCenario(60);
    reproducao.definirVelocidade(velocidade);
    reproducao.iniciar();
    quadro(0);
    quadro(200);
    return reproducao.minuto;
  };

  assert.ok(Math.abs(medir(2) - 2 * medir(1)) < 1e-9);
  assert.ok(Math.abs(medir(0.5) - 0.5 * medir(1)) < 1e-9);
});

test("pausar interrompe o ciclo e mantém o minuto", () => {
  const { reproducao, quadro, pendentes, cancelados } = criarCenario();

  reproducao.iniciar();
  quadro(0);
  quadro(200);
  const minuto = reproducao.minuto;
  reproducao.pausar();

  assert.equal(reproducao.tocando, false);
  assert.equal(reproducao.minuto, minuto);
  assert.equal(pendentes(), 0);
  assert.ok(cancelados() >= 1);
});

test("ao terminar, o ciclo para sozinho no fim exato", () => {
  const { reproducao, quadro, pendentes } = criarCenario(1);

  reproducao.definirVelocidade(4);
  reproducao.iniciar();
  quadro(0);
  for (let t = 200; t < 30000 && reproducao.tocando; t += 200) {
    quadro(t);
  }

  assert.equal(reproducao.minuto, 1);
  assert.equal(reproducao.tocando, false);
  assert.equal(pendentes(), 0);
});

test("reiniciar volta ao início e fica parado", () => {
  const { reproducao, quadro, pendentes } = criarCenario();

  reproducao.iniciar();
  quadro(0);
  quadro(500);
  reproducao.reiniciar();

  assert.equal(reproducao.minuto, 0);
  assert.equal(reproducao.tocando, false);
  assert.equal(pendentes(), 0);
});

test("iniciar depois do fim recomeça do início", () => {
  const { reproducao } = criarCenario();

  reproducao.irPara(60);
  reproducao.iniciar();

  assert.equal(reproducao.minuto, 0);
  assert.equal(reproducao.tocando, true);
});

test("um novo cenário para a reprodução anterior e volta ao início", () => {
  const { reproducao, quadro, pendentes } = criarCenario(60);

  reproducao.iniciar();
  quadro(0);
  quadro(500);
  reproducao.carregar(120);

  assert.equal(reproducao.minuto, 0);
  assert.equal(reproducao.duracao, 120);
  assert.equal(reproducao.tocando, false);
  assert.equal(pendentes(), 0);
});

test("um intervalo longo entre quadros não faz o relógio saltar", () => {
  const { reproducao, quadro } = criarCenario(60);

  reproducao.iniciar();
  quadro(0);
  quadro(60000);

  // No máximo 1 segundo de reprodução por quadro: 2 minutos de um turno de 60 min, em 30 s.
  assert.ok(reproducao.minuto <= 2);
});

test("quadros lentos não atrasam o relógio", () => {
  const { reproducao, quadro } = criarCenario(60);

  reproducao.iniciar();
  quadro(0);
  quadro(800);
  quadro(1600);

  assert.ok(Math.abs(reproducao.minuto - 3.2) < 1e-9);
});

test("ir para um minuto pausa e respeita os limites do turno", () => {
  const { reproducao } = criarCenario(60);

  reproducao.iniciar();
  reproducao.irPara(12.5);
  assert.equal(reproducao.minuto, 12.5);
  assert.equal(reproducao.tocando, false);

  reproducao.irPara(999);
  assert.equal(reproducao.minuto, 60);
  reproducao.irPara(-5);
  assert.equal(reproducao.minuto, 0);
});

test("iniciar duas vezes não cria dois ciclos", () => {
  const { reproducao, pendentes } = criarCenario();

  reproducao.iniciar();
  reproducao.iniciar();

  assert.equal(pendentes(), 1);
});

test("cada mudança avisa a página", () => {
  const { reproducao, atualizacoes, quadro } = criarCenario();

  reproducao.iniciar();
  quadro(0);
  reproducao.pausar();
  reproducao.reiniciar();

  assert.ok(atualizacoes.length >= 3);
});
