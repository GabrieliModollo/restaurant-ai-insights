import { compararPico, descreverErro } from "./api.js";
import { criarExecutor } from "./execucao.js";

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const minutos = valor => numero.format(valor) + " min";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function cartao(titulo, dados) {
  const indicadores = criar("dl");
  for (const [rotulo, valor] of [
    ["Chegadas nos primeiros", minutos(dados.janela_chegadas_min)],
    ["Pedidos prontos no turno", dados.pedidos_prontos],
    ["Pedidos pendentes no fim", dados.pedidos_pendentes],
    ["Maior fila no preparo", dados.fila_maxima_preparo],
    ["Maior fila na embalagem", dados.fila_maxima_embalagem],
    ["Espera média em fila", dados.espera_media_fila_min === null
      ? "Sem pedidos prontos" : minutos(dados.espera_media_fila_min)],
  ]) {
    indicadores.append(criar("div", {}, criar("dt", { textContent: rotulo }),
      criar("dd", { textContent: String(valor) })));
  }
  return criar("div", { className: "alternativa-cartao" }, criar("h4", { textContent: titulo }), indicadores);
}

export function criarComparacaoPico(promocional) {
  const botao = criar("button", { type: "button", className: "botao botao-principal", textContent: "Comparar com pico" });
  const status = criar("p", { role: "status" });
  const resultado = criar("div");
  const secao = criar("details", { id: "comparar-pico", className: "promocao-alternativas" },
    criar("summary", { textContent: "Simular pico de pedidos" }),
    criar("p", { textContent: "Compare pedidos chegando ao longo do turno ou concentrados no primeiro quarto do turno. A equipe, o volume e os tempos de trabalho são os mesmos." }),
    botao, status, resultado);

  const executor = criarExecutor({
    buscar: compararPico,
    aoResultado(dados) {
      botao.setAttribute("aria-disabled", "false");
      status.textContent = "Comparação pronta para " + dados.pedidos_recebidos +
        " pedidos em um turno de " + minutos(dados.duracao_turno_min) + ".";
      resultado.replaceChildren(
        criar("div", { className: "alternativas-cartoes" },
          cartao("Ao longo do turno", dados.distribuido), cartao("No pico", dados.pico)),
        criar("p", { className: "dica", textContent: "A espera média soma as filas de preparo e embalagem e considera apenas pedidos prontos no turno." }),
      );
    },
    aoErro(erro) {
      botao.setAttribute("aria-disabled", "false");
      status.textContent = descreverErro(erro);
    },
  });
  function cancelar() {
    executor.cancelar();
    botao.setAttribute("aria-disabled", "false");
    status.textContent = "";
    resultado.replaceChildren();
  }
  botao.addEventListener("click", () => {
    if (botao.getAttribute("aria-disabled") === "true") return;
    cancelar();
    botao.setAttribute("aria-disabled", "true");
    status.textContent = "Comparando chegadas…";
    executor.executar(promocional);
  });
  return { secao, cancelar };
}
