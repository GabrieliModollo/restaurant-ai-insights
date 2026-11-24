import { calcularFicha, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";

const UNIDADES = [["g", "g"], ["kg", "kg"], ["ml", "mL"], ["l", "L"], ["un", "un"]];
const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dinheiroFracionario = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", maximumFractionDigits: 4,
});
const dataBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function campo(id, rotulo, controle) {
  controle.id = id;
  controle.setAttribute("form", "ficha-formulario");
  return criar("div", { className: "ficha-campo" },
    criar("label", { htmlFor: id, textContent: rotulo }),
    controle,
  );
}

function unidade() {
  return criar("select", {}, ...UNIDADES.map(([value, textContent]) => criar("option", { value, textContent })));
}

function criarIngrediente(indice, remover) {
  const nome = criar("input", { type: "text", required: true, maxLength: 80 });
  const preco = criar("input", {
    type: "number", inputMode: "decimal", min: "0", max: "100000", step: "0.01", required: true,
  });
  const quantidade = () => criar("input", {
    type: "number", inputMode: "decimal", min: "0.001", max: "1000000", step: "0.001", required: true,
  });
  const comprada = quantidade();
  const usada = quantidade();
  const unidadeCompra = unidade();
  const unidadeUso = unidade();
  const data = criar("input", { type: "date", min: "0001-01-01", max: "9999-12-31", required: true });
  const legenda = criar("legend");
  const erro = criar("p", { className: "erro-campo" });
  const botaoRemover = criar("button", { type: "button", className: "botao", textContent: "Remover ingrediente" });
  const campoDoIngrediente = (chave, rotulo, controle) => campo(`ficha-item-${indice}-${chave}`, rotulo, controle);
  const elemento = criar("fieldset", {}, legenda,
    campoDoIngrediente("nome", "Ingrediente", nome),
    campoDoIngrediente("preco", "Preço da compra (R$)", preco),
    criar("div", { className: "ficha-medida" },
      campoDoIngrediente("comprada", "Quantidade comprada", comprada),
      campoDoIngrediente("unidade-compra", "Unidade de compra", unidadeCompra)),
    criar("div", { className: "ficha-medida" },
      campoDoIngrediente("usada", "Quantidade usada por porção", usada),
      campoDoIngrediente("unidade-uso", "Unidade usada", unidadeUso)),
    campoDoIngrediente("data", "Data do preço", data),
    erro, botaoRemover,
  );
  const item = {
    elemento, legenda, nome, erro, botaoRemover,
    vazio: () => [nome, preco, comprada, usada, data].every(controle => !controle.value),
    preencherExemplo() {
      nome.value = "Farinha";
      preco.value = "20";
      comprada.value = "1";
      unidadeCompra.value = "kg";
      usada.value = "150";
      unidadeUso.value = "g";
      data.value = "2026-11-24";
    },
    valores: () => ({
      nome: nome.value.trim(),
      preco_compra_centavos: Math.round(Number(preco.value) * 100),
      quantidade_comprada: Number(comprada.value),
      unidade_compra: unidadeCompra.value,
      quantidade_usada: Number(usada.value),
      unidade_uso: unidadeUso.value,
      data_preco: data.value,
    }),
  };
  botaoRemover.addEventListener("click", () => remover(item));
  return item;
}

export function criarFichaTecnica(custoManual) {
  const ficha = document.getElementById("ficha-tecnica");
  const formulario = document.getElementById("ficha-formulario");
  const lista = document.getElementById("ficha-ingredientes");
  const adicionar = document.getElementById("ficha-adicionar");
  const exemplo = document.getElementById("ficha-exemplo");
  const calcular = document.getElementById("ficha-calcular");
  const status = document.getElementById("ficha-status");
  const resultado = document.getElementById("ficha-resultado");
  const custos = document.getElementById("ficha-custos");
  const aplicar = document.getElementById("ficha-aplicar");
  const itens = [];
  let totalCentavos = null;
  let proximoIndice = 1;

  custoManual.closest(".controle").append(ficha);

  const executor = criarExecutor({
    buscar: calcularFicha,
    aoResultado(dados) {
      totalCentavos = dados.total_centavos;
      calcular.disabled = false;
      const total = dinheiro.format(totalCentavos / 100);
      status.textContent = dados.aplicavel_ao_simulador
        ? `Custo de ingredientes por porção: ${total}.`
        : `Custo por porção: ${total}. O total ultrapassa o limite do campo de ingredientes do simulador.`;
      custos.replaceChildren(...dados.itens.map(({ nome, data_preco, custo_reais }) =>
        criar("li", { textContent: `${nome}: ${dinheiroFracionario.format(custo_reais)} · preço de ${dataBr.format(new Date(data_preco))}` }),
      ));
      aplicar.hidden = !dados.aplicavel_ao_simulador;
      resultado.hidden = false;
    },
    aoErro(erro) {
      calcular.disabled = false;
      if (!(erro instanceof ErroDeValidacao)) {
        status.textContent = descreverErro(erro);
        return;
      }
      status.textContent = "Confira os dados dos ingredientes.";
      for (const [chave, mensagem] of Object.entries(erro.erros)) {
        const [grupo, indice] = chave.split(".");
        const item = grupo === "ingredientes" ? itens[Number(indice)] : null;
        if (item) item.erro.textContent += `${mensagem} `;
        else status.textContent += ` ${mensagem}`;
      }
    },
  });

  function invalidar() {
    executor.cancelar();
    totalCentavos = null;
    resultado.hidden = true;
    calcular.disabled = false;
    status.textContent = "";
    for (const item of itens) item.erro.textContent = "";
  }

  function atualizarLista() {
    itens.forEach((item, indice) => {
      item.legenda.textContent = `Ingrediente ${indice + 1}`;
      item.botaoRemover.disabled = itens.length === 1;
    });
    adicionar.disabled = itens.length >= 20;
    exemplo.disabled = itens.length >= 20;
  }

  function adicionarIngrediente() {
    const item = criarIngrediente(proximoIndice++, removido => {
      const indice = itens.indexOf(removido);
      itens.splice(indice, 1);
      removido.elemento.remove();
      atualizarLista();
      invalidar();
      itens[Math.min(indice, itens.length - 1)].nome.focus();
    });
    itens.push(item);
    lista.append(item.elemento);
    atualizarLista();
    return item;
  }

  adicionarIngrediente();
  adicionar.addEventListener("click", () => {
    const item = adicionarIngrediente();
    invalidar();
    item.nome.focus();
  });

  exemplo.addEventListener("click", () => {
    const item = itens.find(ingrediente => ingrediente.vazio()) ?? adicionarIngrediente();
    item.preencherExemplo();
    invalidar();
    item.nome.focus();
  });

  ficha.addEventListener("input", invalidar);
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    invalidar();
    calcular.disabled = true;
    status.textContent = "Calculando o custo por porção…";
    executor.executar({ ingredientes: itens.map(item => item.valores()) });
  });

  aplicar.addEventListener("click", () => {
    if (totalCentavos === null || aplicar.hidden) return;
    custoManual.value = (totalCentavos / 100).toFixed(2);
    custoManual.dispatchEvent(new Event("input"));
    custoManual.focus();
    status.textContent = `Custo aplicado: ${dinheiro.format(totalCentavos / 100)} por porção. Os resultados do cenário serão atualizados.`;
  });
}
