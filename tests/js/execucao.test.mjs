import assert from "node:assert/strict";
import { test } from "node:test";

import { criarExecutor } from "../../src/simulador/web/js/execucao.js";

// Busca controlada à mão: cada chamada fica pendente até o teste decidir o resultado.
// Ela ignora o cancelamento de propósito, como uma resposta que já estava a caminho.
function criarCenario() {
  const pendentes = [];
  const resultados = [];
  const erros = [];
  const executor = criarExecutor({
    buscar: (valores, signal) =>
      new Promise((resolver, rejeitar) => pendentes.push({ valores, signal, resolver, rejeitar })),
    aoResultado: (resultado) => resultados.push(resultado),
    aoErro: (erro) => erros.push(erro),
  });
  return { executor, pendentes, resultados, erros };
}

test("a resposta é entregue quando o pedido é o mais recente", async () => {
  const { executor, pendentes, resultados, erros } = criarCenario();

  const execucao = executor.executar("A");
  pendentes[0].resolver("resultado A");
  await execucao;

  assert.deepEqual(resultados, ["resultado A"]);
  assert.deepEqual(erros, []);
});

test("resposta antiga que chega depois não sobrescreve o cenário mais recente", async () => {
  const { executor, pendentes, resultados } = criarCenario();

  const antiga = executor.executar("A");
  const nova = executor.executar("B");
  pendentes[1].resolver("resultado B");
  await nova;
  pendentes[0].resolver("resultado A");
  await antiga;

  assert.deepEqual(resultados, ["resultado B"]);
});

test("erro de um pedido antigo não aparece para o usuário", async () => {
  const { executor, pendentes, resultados, erros } = criarCenario();

  const antiga = executor.executar("A");
  const nova = executor.executar("B");
  pendentes[0].rejeitar(new Error("falhou"));
  await antiga;
  pendentes[1].resolver("resultado B");
  await nova;

  assert.deepEqual(erros, []);
  assert.deepEqual(resultados, ["resultado B"]);
});

test("um novo pedido cancela o anterior", () => {
  const { executor, pendentes } = criarCenario();

  executor.executar("A");
  executor.executar("B");

  assert.equal(pendentes[0].signal.aborted, true);
  assert.equal(pendentes[1].signal.aborted, false);
});

test("cancelar descarta a resposta em andamento", async () => {
  const { executor, pendentes, resultados } = criarCenario();

  const execucao = executor.executar("A");
  executor.cancelar();
  pendentes[0].resolver("resultado A");
  await execucao;

  assert.equal(pendentes[0].signal.aborted, true);
  assert.deepEqual(resultados, []);
});

test("erro do pedido atual é entregue", async () => {
  const { executor, pendentes, erros } = criarCenario();
  const falha = new Error("falhou");

  const execucao = executor.executar("A");
  pendentes[0].rejeitar(falha);
  await execucao;

  assert.deepEqual(erros, [falha]);
});
