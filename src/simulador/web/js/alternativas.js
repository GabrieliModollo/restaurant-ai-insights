import { compararAlternativas, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const reais = centavos => moeda.format(centavos / 100);

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function cartao(titulo, dados) {
  const indicadores = criar("dl");
  for (const [rotulo, valor] of [
    ["Pedidos prontos", dados.pedidos_prontos],
    ["Contribuição", reais(dados.contribuicao_centavos)],
    ["Custo adicional de equipe", reais(dados.custo_adicional_centavos)],
    ["Resultado após custo adicional", reais(dados.resultado_ajustado_centavos)],
  ]) {
    indicadores.append(criar("div", {}, criar("dt", { textContent: rotulo }),
      criar("dd", { textContent: String(valor) })));
  }
  return criar("div", { className: "alternativa-cartao" }, criar("h4", { textContent: titulo }), indicadores);
}

export function criarComparacaoAlternativas(hipotese) {
  const secao = criar("section", { className: "promocao-alternativas", id: "comparar-alternativas" },
    criar("h3", { textContent: "Desconto menor ou reforço de equipe?" }));
  const descontoAtual = hipotese.promocional.desconto;
  if (descontoAtual <= 0) {
    secao.append(criar("p", { textContent: "Analise uma hipótese com desconto acima de zero para comparar." }));
    return { secao, cancelar() {}, exportar: () => null };
  }

  const desconto = criar("input", {
    id: "alternativa-desconto", type: "number", min: "0", step: "0.01", max: (descontoAtual - 0.01).toFixed(2),
    value: Math.max(0, descontoAtual - 2).toFixed(2), required: true,
  });
  const custo = criar("input", { id: "alternativa-custo", type: "number", min: "0", step: "0.01", max: "1000000", required: true });
  const estacao = criar("select", { id: "alternativa-estacao" },
    criar("option", { value: "pessoas_preparo", textContent: "Preparo" }),
    criar("option", { value: "pessoas_embalagem", textContent: "Embalagem" }),
  );
  const botao = criar("button", { className: "botao botao-principal", type: "submit", textContent: "Comparar alternativas" });
  const campo = (rotulo, controle) => criar("div", {}, criar("label", { htmlFor: controle.id, textContent: rotulo }), controle);
  const formulario = criar("form", { className: "promocao-formulario alternativas-formulario" },
    campo("Desconto reduzido (R$)", desconto),
    campo("Onde adicionar uma pessoa", estacao),
    campo("Custo do reforço no turno (R$)", custo),
    botao,
  );
  const status = criar("p", { role: "status" });
  const resultado = criar("div", { className: "alternativas-resultado" });
  let opcoesCalculadas = null;
  secao.append(criar("p", { textContent:
    "As duas opções usam o mesmo volume de pedidos e turno. O reforço mantém o desconto da hipótese analisada." }),
  formulario, status, resultado);

  function cancelar() {
    executor.cancelar();
    botao.setAttribute("aria-disabled", "false");
  }

  const executor = criarExecutor({
    async buscar(opcoes, signal) {
      return { opcoes, dados: await compararAlternativas({ ...hipotese, ...opcoes }, signal) };
    },
    aoResultado({ dados, opcoes }) {
      opcoesCalculadas = opcoes;
      botao.setAttribute("aria-disabled", "false");
      const diferenca = dados.diferenca_reforco_centavos;
      status.textContent = diferenca === 0 ? "As alternativas empatam após o custo adicional."
        : (diferenca > 0 ? "Reforço de equipe" : "Desconto menor") +
          " deixa " + reais(Math.abs(diferenca)) + " a mais após o custo adicional.";
      const contexto = dados.turnos_diferentes
        ? "A referência tem duração diferente das alternativas."
        : "Contribuição do turno de referência: " + reais(dados.referencia_centavos) + ".";
      resultado.replaceChildren(
        criar("p", { textContent: contexto }),
        criar("div", { className: "alternativas-cartoes" },
          cartao("Desconto menor", dados.desconto_menor), cartao("Reforço de equipe", dados.reforco_equipe)),
        criar("p", { className: "nota-rodape", textContent: "O resultado ajustado considera o custo adicional informado. Outros custos fixos e impostos ficam de fora." }),
      );
    },
    aoErro(erro) {
      botao.setAttribute("aria-disabled", "false");
      status.textContent = erro instanceof ErroDeValidacao
        ? Object.values(erro.erros).join(" ").replaceAll("Value error, ", "")
        : descreverErro(erro);
    },
  });

  function limpar() {
    cancelar();
    opcoesCalculadas = null;
    resultado.replaceChildren();
    status.textContent = "";
  }
  formulario.addEventListener("input", limpar);
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (botao.getAttribute("aria-disabled") === "true") return;
    limpar();
    botao.setAttribute("aria-disabled", "true");
    status.textContent = "Comparando…";
    executor.executar({
      desconto_menor_centavos: Math.round(desconto.valueAsNumber * 100),
      estacao: estacao.value,
      custo_adicional_centavos: Math.round(custo.valueAsNumber * 100),
    });
  });
  return { secao, cancelar, exportar: () => opcoesCalculadas };
}
