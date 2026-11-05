import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { compararCenarios, criarControleCenarioA } from "../../src/simulador/web/js/comparacao.js";

const FIXTURE = JSON.parse(
  readFileSync(new URL("../fixtures/simulacoes.json", import.meta.url), "utf-8"),
);

const CAMPOS = [
  { nome: "preco_venda", rotulo: "Preço de venda", unidade: "R$" },
  { nome: "desconto", rotulo: "Desconto por pedido", unidade: "R$" },
  { nome: "taxa_canal_pct", rotulo: "Taxa do canal", unidade: "%" },
  { nome: "pedidos", rotulo: "Pedidos recebidos no turno", unidade: "pedidos" },
  { nome: "duracao_turno_min", rotulo: "Duração do turno", unidade: "min" },
];

function parametros(alteracoes = {}) {
  return { preco_venda: 35, desconto: 0, taxa_canal_pct: 15, pedidos: 20, duracao_turno_min: 60, ...alteracoes };
}

function resultado(alteracoes = {}) {
  const base = structuredClone(FIXTURE.padrao);
  Object.assign(base.operacao, alteracoes.operacao ?? {});
  Object.assign(base.financeiro, alteracoes.financeiro ?? {});
  return base;
}

function linha(comparacao, rotulo) {
  return comparacao.indicadores.find((item) => item.rotulo === rotulo);
}

const normal = (texto) => texto.replace(/ /g, " ");

test("o cenário A só pode ser guardado com um resultado válido e atual", () => {
  const controle = criarControleCenarioA();

  assert.equal(controle.podeSalvar, false);
  assert.equal(controle.salvar(), false);

  controle.registrar(parametros(), resultado());
  controle.definirSituacao("atualizado");
  assert.equal(controle.podeSalvar, true);
  assert.equal(controle.salvar(), true);
  assert.ok(controle.a);
});

test("não guarda durante espera, erro ou entrada inválida", () => {
  for (const situacao of ["calculando", "desatualizado", "erro"]) {
    const controle = criarControleCenarioA();
    controle.registrar(parametros(), resultado());
    controle.definirSituacao("atualizado");
    controle.definirSituacao(situacao);

    assert.equal(controle.podeSalvar, false, situacao);
    assert.equal(controle.salvar(), false, situacao);
    assert.equal(controle.a, null, situacao);
  }
});

test("mudar o cenário atual não altera o cenário A", () => {
  const controle = criarControleCenarioA();
  const dadosDeEntrada = parametros();
  const dadosDoResultado = resultado();
  controle.registrar(dadosDeEntrada, dadosDoResultado);
  controle.definirSituacao("atualizado");
  controle.salvar();

  // Nem alterar os objetos originais nem registrar um novo cenário muda A.
  dadosDeEntrada.preco_venda = 999;
  dadosDoResultado.financeiro.contribuicao_total_centavos = -1;
  controle.registrar(parametros({ preco_venda: 50 }), resultado({ financeiro: { contribuicao_total_centavos: 7 } }));

  assert.equal(controle.a.parametros.preco_venda, 35);
  assert.equal(controle.a.resultado.financeiro.contribuicao_total_centavos, FIXTURE.padrao.financeiro.contribuicao_total_centavos);
});

test("o cenário A não guarda a lista de eventos, que não é usada na comparação", () => {
  const controle = criarControleCenarioA();
  controle.registrar(parametros(), resultado());
  controle.definirSituacao("atualizado");
  controle.salvar();

  assert.equal(controle.a.resultado.operacao.eventos, undefined);
  assert.ok(controle.ultimo.resultado.operacao.eventos.length > 0);
});

test("substituir e limpar são ações explícitas", () => {
  const controle = criarControleCenarioA();
  controle.registrar(parametros(), resultado());
  controle.definirSituacao("atualizado");
  controle.salvar();

  controle.registrar(parametros({ desconto: 5 }), resultado());
  assert.equal(controle.a.parametros.desconto, 0);

  controle.salvar();
  assert.equal(controle.a.parametros.desconto, 5);

  controle.limpar();
  assert.equal(controle.a, null);
});

test("lista só os parâmetros alterados, com unidade", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado() },
    { parametros: parametros({ desconto: 5, taxa_canal_pct: 10 }), resultado: resultado() },
    CAMPOS,
  );

  assert.deepEqual(
    comparacao.parametrosAlterados.map((item) => [item.rotulo, normal(item.a), normal(item.atual)]),
    [
      ["Desconto por pedido", "R$ 0", "R$ 5"],
      ["Taxa do canal", "15%", "10%"],
    ],
  );
});

test("uma pessoa ou um pedido aparece no singular", () => {
  const campos = [
    { nome: "pedidos", rotulo: "Pedidos", unidade: "pedidos" },
    { nome: "pessoas_embalagem", rotulo: "Pessoas", unidade: "pessoas" },
  ];
  const comparacao = compararCenarios(
    { parametros: { pedidos: 1, pessoas_embalagem: 1 }, resultado: resultado() },
    { parametros: { pedidos: 2, pessoas_embalagem: 3 }, resultado: resultado() },
    campos,
  );

  assert.deepEqual(
    comparacao.parametrosAlterados.map((item) => [item.a, item.atual]),
    [
      ["1 pedido", "2 pedidos"],
      ["1 pessoa", "3 pessoas"],
    ],
  );
});

test("diferenças monetárias são calculadas em centavos, sem erro de arredondamento", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ financeiro: { receita_atendida_centavos: 10 } }) },
    { parametros: parametros(), resultado: resultado({ financeiro: { receita_atendida_centavos: 30 } }) },
    CAMPOS,
  );
  const receita = linha(comparacao, "Receita atendida");

  assert.equal(normal(receita.a), "R$ 0,10");
  assert.equal(normal(receita.atual), "R$ 0,30");
  assert.equal(normal(receita.diferenca), "+R$ 0,20");
});

test("mostra diferença negativa, zero e de pedidos sem percentuais", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ operacao: { pedidos_concluidos: 18, pedidos_pendentes: 2 }, financeiro: { contribuicao_total_centavos: 500 } }) },
    { parametros: parametros(), resultado: resultado({ operacao: { pedidos_concluidos: 15, pedidos_pendentes: 2 }, financeiro: { contribuicao_total_centavos: 200 } }) },
    CAMPOS,
  );

  assert.equal(linha(comparacao, "Pedidos concluídos").diferenca, "−3");
  assert.equal(linha(comparacao, "Pedidos pendentes").diferenca, "0");
  assert.equal(normal(linha(comparacao, "Valor que sobra no turno").diferenca), "−R$ 3,00");
  for (const item of comparacao.indicadores) {
    assert.ok(!item.diferenca.includes("%"));
  }
});

test("base zero não gera percentual nem erro", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ operacao: { pedidos_concluidos: 0 }, financeiro: { receita_atendida_centavos: 0 } }) },
    { parametros: parametros(), resultado: resultado({ operacao: { pedidos_concluidos: 5 }, financeiro: { receita_atendida_centavos: 500 } }) },
    CAMPOS,
  );

  assert.equal(linha(comparacao, "Pedidos concluídos").diferenca, "+5");
  assert.equal(normal(linha(comparacao, "Receita atendida").diferenca), "+R$ 5,00");
});

test("médias ausentes aparecem como não comparáveis, e não como zero", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ operacao: { espera_media_fila_min: null, tempo_total_medio_min: null } }) },
    { parametros: parametros(), resultado: resultado({ operacao: { espera_media_fila_min: 2.5, tempo_total_medio_min: 9 } }) },
    CAMPOS,
  );
  const espera = linha(comparacao, "Espera média");

  assert.equal(espera.a, "Sem pedidos concluídos");
  assert.equal(espera.atual, "2,5 min");
  assert.equal(espera.diferenca, "Não comparável");
});

test("diferença de espera é só informada, sem chamar aumento de melhoria", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ operacao: { espera_media_fila_min: 1.1 } }) },
    { parametros: parametros(), resultado: resultado({ operacao: { espera_media_fila_min: 2.3 } }) },
    CAMPOS,
  );

  assert.equal(linha(comparacao, "Espera média").diferenca, "+1,2 min");
  assert.equal(comparacao.vencedor, undefined);
  assert.ok(!JSON.stringify(comparacao).match(/melhor|pior|vencedor/i));
});

test("turnos com durações diferentes são destacados", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado({ operacao: { duracao_turno_min: 60 } }) },
    { parametros: parametros({ duracao_turno_min: 90 }), resultado: resultado({ operacao: { duracao_turno_min: 90 } }) },
    CAMPOS,
  );

  assert.equal(comparacao.duracoesDiferentes, true);
  assert.equal(comparacao.periodoA, "Turno de 60 min");
  assert.equal(comparacao.periodoAtual, "Turno de 90 min");
});

test("turnos iguais não geram aviso de período", () => {
  const comparacao = compararCenarios(
    { parametros: parametros(), resultado: resultado() },
    { parametros: parametros(), resultado: resultado() },
    CAMPOS,
  );

  assert.equal(comparacao.duracoesDiferentes, false);
  assert.deepEqual(comparacao.parametrosAlterados, []);
});
