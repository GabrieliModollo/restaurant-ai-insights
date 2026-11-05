import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  descreverErro,
  ErroDeConexao,
  ErroDeValidacao,
  ErroDoServidor,
  simular,
} from "../../src/simulador/web/js/api.js";

const fetchOriginal = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

function responderCom(corpo, status) {
  globalThis.fetch = async () => new Response(corpo, { status });
}

test("resposta válida devolve o resultado", async () => {
  responderCom('{"financeiro": {}}', 200);

  assert.deepEqual(await simular({}), { financeiro: {} });
});

test("422 vira erro de validação, com as mensagens por campo", async () => {
  responderCom('{"erros": {"desconto": "Inválido."}}', 422);

  await assert.rejects(simular({}), (erro) => {
    assert.ok(erro instanceof ErroDeValidacao);
    assert.deepEqual(erro.erros, { desconto: "Inválido." });
    return true;
  });
});

test("422 fora do formato combinado é tratado como erro do servidor", async () => {
  responderCom("texto", 422);

  await assert.rejects(simular({}), ErroDoServidor);
});

test("erro 500 vira erro do servidor, sem usar o corpo da resposta", async () => {
  responderCom("Internal Server Error", 500);

  await assert.rejects(simular({}), (erro) => {
    assert.ok(erro instanceof ErroDoServidor);
    assert.equal(erro.status, 500);
    assert.doesNotMatch(descreverErro(erro), /Internal/);
    return true;
  });
});

test("resposta 200 ilegível vira erro do servidor", async () => {
  responderCom("<html>", 200);

  await assert.rejects(simular({}), ErroDoServidor);
});

test("falha de rede vira erro de conexão", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  await assert.rejects(simular({}), ErroDeConexao);
});

test("cancelamento continua sendo cancelamento", async () => {
  globalThis.fetch = async (_, { signal }) => {
    signal.throwIfAborted();
    return new Response("{}");
  };
  const controle = new AbortController();
  controle.abort();

  await assert.rejects(simular({}, controle.signal), { name: "AbortError" });
});

test("cada falha tem uma descrição própria para a pessoa usuária", () => {
  const tempo = new DOMException("demorou", "TimeoutError");

  assert.match(descreverErro(tempo), /demorou/);
  assert.match(descreverErro(new ErroDeConexao()), /conectar/);
  assert.match(descreverErro(new ErroDoServidor(503)), /503/);
});
