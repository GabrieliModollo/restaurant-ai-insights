import { compararCanais, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const reais = centavos => moeda.format(centavos / 100);

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function configurarCanal(rotulo, hipotese) {
  const desconto = hipotese.promocional.desconto.toFixed(2);
  const campos = [
    ["comissao_bps", "Comissão (%)", 100, 0],
    ["pagamento_bps", "Taxa de pagamento (%)", 100, 0],
    ["frete_loja_centavos", "Frete pago pela loja (R$)", 1000000, 0],
    ["desconto_loja_centavos", "Desconto pago pela loja (R$)", desconto, desconto],
    ["subsidio_plataforma_centavos", "Subsídio da plataforma (R$)", desconto, 0],
  ];
  const entradas = {};
  const grupo = criar("fieldset", { className: "alternativa-cartao canal-campos" },
    criar("legend", { textContent: "Canal " + rotulo }));
  for (const [nome, texto, maximo, valor] of campos) {
    const entrada = criar("input", {
      id: "canal-" + rotulo.toLowerCase() + "-" + nome,
      type: "number", inputMode: "decimal", min: "0", max: String(maximo),
      step: "0.01", required: true, value: String(valor),
    });
    entradas[nome] = entrada;
    grupo.append(criar("div", {}, criar("label", { htmlFor: entrada.id, textContent: texto }), entrada));
  }
  return {
    grupo,
    valores: () => Object.fromEntries(Object.entries(entradas).map(
      ([nome, entrada]) => [nome, Math.round(entrada.valueAsNumber * 100)],
    )),
  };
}

function cartao(rotulo, dados) {
  const indicadores = criar("dl");
  for (const [nome, centavos] of [
    ["Desconto pago pela loja por pedido", dados.desconto_loja_centavos],
    ["Subsídio da plataforma por pedido", dados.subsidio_plataforma_centavos],
    ["Receita do item para a loja antes das taxas", dados.valor_loja_por_pedido_centavos],
    ["Comissão por pedido", dados.comissao_por_pedido_centavos],
    ["Pagamento por pedido", dados.pagamento_por_pedido_centavos],
    ["Frete pago pela loja por pedido", dados.frete_loja_centavos],
    ["Contribuição por pedido pronto", dados.contribuicao_por_pedido_centavos],
    ["Contribuição no turno", dados.contribuicao_total_centavos],
  ]) {
    indicadores.append(criar("div", {}, criar("dt", { textContent: nome }), criar("dd", { textContent: reais(centavos) })));
  }
  return criar("div", { className: "alternativa-cartao" },
    criar("h4", { textContent: "Canal " + rotulo }), indicadores);
}

export function criarComparacaoCanais(hipotese) {
  const a = configurarCanal("A", hipotese);
  const b = configurarCanal("B", hipotese);
  const botao = criar("button", { className: "botao botao-principal", type: "submit", textContent: "Comparar canais" });
  const formulario = criar("form", { className: "promocao-formulario canais-formulario" }, a.grupo, b.grupo, botao);
  const status = criar("p", { role: "status" });
  const resultado = criar("div");
  const secao = criar("details", { id: "comparar-canais", className: "promocao-alternativas" },
    criar("summary", { textContent: "Comparar custos por canal" }),
    criar("p", { textContent: "Parcela da loja e subsídio devem somar " + reais(Math.round(hipotese.promocional.desconto * 100)) +
      " em cada canal. Por padrão, a loja banca todo o desconto. Preencha as taxas e o frete de cada cenário." }),
    criar("p", { className: "dica", textContent: "Comissão e pagamento incidem sobre o preço do item menos o desconto pago pela loja. Informe o frete que a loja paga por pedido." }),
    formulario, status, resultado,
  );

  function liberar() {
    botao.setAttribute("aria-disabled", "false");
  }
  const executor = criarExecutor({
    buscar: compararCanais,
    aoResultado(dados) {
      liberar();
      const dif = dados.diferenca_b_menos_a_centavos;
      status.textContent = dif === 0 ? "Os canais têm a mesma contribuição no turno."
        : "Canal " + (dif > 0 ? "B" : "A") + " deixa " + reais(Math.abs(dif)) + " a mais no turno.";
      const contexto = dados.pedidos_prontos + " pedidos prontos de " + dados.pedidos_recebidos +
        " recebidos em " + dados.duracao_turno_min + " min. Preço do item ao cliente: " + reais(dados.preco_cliente_centavos) + ".";
      resultado.replaceChildren(criar("p", { textContent: contexto }),
        criar("p", { textContent: "Contribuição do turno de referência: " + reais(dados.referencia_centavos) + "." +
          (dados.turnos_diferentes ? " A referência cobre uma duração diferente." : "") }),
        criar("div", { className: "alternativas-cartoes" }, cartao("A", dados.canal_a), cartao("B", dados.canal_b)));
    },
    aoErro(erro) {
      liberar();
      status.textContent = erro instanceof ErroDeValidacao
        ? Object.values(erro.erros).join(" ").replaceAll("Value error, ", "")
        : descreverErro(erro);
    },
  });
  function cancelar() {
    executor.cancelar();
    liberar();
  }
  formulario.addEventListener("input", () => {
    cancelar();
    status.textContent = "";
    resultado.replaceChildren();
  });
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (botao.getAttribute("aria-disabled") === "true") return;
    resultado.replaceChildren();
    status.textContent = "Comparando…";
    botao.setAttribute("aria-disabled", "true");
    executor.executar({ ...hipotese, canal_a: a.valores(), canal_b: b.valores() });
  });
  return { secao, cancelar };
}
