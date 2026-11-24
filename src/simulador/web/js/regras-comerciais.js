import { consultarRegras, descreverErro } from "./api.js";
import { criarExecutor } from "./execucao.js";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

const EXEMPLO = "Por que a mesma promoção pode deixar contribuições diferentes no iFood e na 99Food?";
const dataBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function criarConsultaComercial(confirmados) {
  const pergunta = criar("input", { id: "pergunta-regras", type: "text", minLength: 3, maxLength: 300, required: true });
  const exemplo = criar("button", { type: "button", className: "botao", textContent: "Usar pergunta de exemplo" });
  const buscar = criar("button", { type: "submit", className: "botao botao-principal", textContent: "Consultar fontes" });
  const formulario = criar("form", { className: "promocao-formulario consulta-regras-formulario" },
    criar("div", {}, criar("label", { htmlFor: pergunta.id, textContent: "O que você quer saber sobre as cobranças?" }), pergunta),
    criar("div", { className: "ficha-acoes" }, buscar, exemplo));
  const status = criar("p", { role: "status" });
  const conteudo = criar("div", { id: "regras-comerciais-resultado" });
  const secao = criar("details", { id: "consultar-regras-comerciais", className: "promocao-alternativas" },
    criar("summary", { textContent: "Consultar regras de iFood e 99Food" }),
    formulario, status, conteudo,
  );

  function liberar() {
    buscar.setAttribute("aria-disabled", "false");
  }
  const executor = criarExecutor({
    buscar: consultarRegras,
    aoResultado(dados) {
      liberar();
      status.textContent = dados.orientacao;
      if (!dados.fontes.length) return;
      const referencias = dados.fontes.map(({ titulo, url, consultado_em, resumo }) => criar("li", {},
        criar("p", { textContent: resumo }),
        criar("a", { href: url, target: "_blank", rel: "noopener noreferrer", textContent: titulo }),
        criar("p", { className: "dica", textContent: "Consultado em " + dataBr.format(new Date(consultado_em)) }),
      ));
      const pendencia = dados.dados_faltantes.length
        ? "Confira antes de calcular: " + dados.dados_faltantes.join(", ") + "."
        : "Os campos desta consulta já foram preenchidos nos dois canais.";
      conteudo.replaceChildren(criar("p", { textContent: dados.resposta }),
        criar("ul", {}, ...referencias), criar("p", { textContent: pendencia }),
        criar("p", { className: "dica", textContent: "Use Comparar canais para calcular com os valores informados." }));
    },
    aoErro(erro) {
      liberar();
      status.textContent = descreverErro(erro);
    },
  });
  function cancelar() {
    executor.cancelar();
    liberar();
    status.textContent = "";
    conteudo.replaceChildren();
  }
  exemplo.addEventListener("click", () => {
    cancelar();
    pergunta.value = EXEMPLO;
    pergunta.focus();
  });
  pergunta.addEventListener("input", cancelar);
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (buscar.getAttribute("aria-disabled") === "true") return;
    cancelar();
    if (pergunta.value.trim().length < 3) {
      status.textContent = "Digite uma pergunta com pelo menos três caracteres.";
      return;
    }
    buscar.setAttribute("aria-disabled", "true");
    status.textContent = "Consultando guias…";
    executor.executar({ pergunta: pergunta.value.trim(), confirmados: confirmados() });
  });
  return { secao, cancelar };
}
