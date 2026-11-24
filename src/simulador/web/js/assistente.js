// Assistente de decisões: envia a pergunta e o cenário atual e mostra a resposta calculada no servidor.
// Nenhum número é calculado aqui.

import { descreverErro, ErroDeValidacao, perguntarAssistente } from "./api.js";
import { criarExecutor } from "./execucao.js";

export const EXEMPLOS = [
  "Um desconto de R$ 5 se paga?",
  "E se eu colocar mais uma pessoa no preparo?",
  "Quantos pedidos ficam prontos se chegarem 30?",
  "Quem paga o desconto no iFood?",
];

const MOTIVOS = {
  desativada: "Interpretado por regras · IA local desativada",
  indisponivel: "Interpretado por regras · Ollama indisponível",
  resposta_invalida: "Interpretado por regras · o modelo não devolveu os dados esperados",
  numero_nao_citado: "Interpretado por regras · o modelo usou um número que não estava na pergunta",
  interpretacao_incompleta: "Interpretado por regras · a leitura do modelo ficou incompleta",
};

export function descreverOrigem(dados) {
  if (dados.origem === "ia_local") return `Interpretado por IA local · ${dados.modelo}`;
  return MOTIVOS[dados.motivo] ?? "Interpretado por regras";
}

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function renderizar(dados, alvo, perguntar) {
  const partes = [criar("p", { className: "assistente-texto", textContent: dados.resposta })];
  if (dados.dados.length) {
    partes.push(criar("dl", { className: "promocao-metricas assistente-metricas" },
      ...dados.dados.map(({ rotulo, valor }) =>
        criar("div", {}, criar("dt", { textContent: rotulo }), criar("dd", { textContent: valor })))));
  }
  if (dados.alertas.length) {
    partes.push(criar("ul", { className: "promocao-alertas" },
      ...dados.alertas.map(textContent => criar("li", { textContent }))));
  }
  if (dados.fontes.length) {
    partes.push(criar("p", { className: "assistente-rotulo", textContent: "Fontes consultadas" }),
      criar("ul", { className: "assistente-fontes" }, ...dados.fontes.map(({ titulo, url, consultado_em }) =>
        criar("li", {}, criar("a", { href: url, textContent: titulo, target: "_blank", rel: "noopener noreferrer" }),
          ` · consultado em ${consultado_em.split("-").reverse().join("/")}`))));
  }
  if (dados.exemplos?.length) {
    partes.push(criar("div", { className: "assistente-exemplos" }, ...dados.exemplos.map(exemplo => {
      const botao = criar("button", { type: "button", className: "botao", textContent: exemplo });
      botao.addEventListener("click", () => perguntar(exemplo));
      return botao;
    })));
  }
  partes.push(criar("p", { className: "dica assistente-origem" },
    `${dados.entendimento} `, criar("span", { className: "selo", textContent: descreverOrigem(dados) })));
  alvo.replaceChildren(...partes);
  alvo.hidden = false;
}

export function iniciarAssistente(obterCenario) {
  const formulario = document.getElementById("assistente-formulario");
  const campo = document.getElementById("assistente-pergunta");
  const botao = formulario.querySelector("button[type=submit]");
  const status = document.getElementById("assistente-status");
  const resposta = document.getElementById("assistente-resposta");

  function concluir(texto) {
    botao.disabled = false;
    botao.textContent = "Perguntar";
    status.textContent = texto;
  }

  const executor = criarExecutor({
    buscar: perguntarAssistente,
    aoResultado(dados) {
      concluir("");
      renderizar(dados, resposta, perguntar);
    },
    aoErro(erro) {
      if (erro instanceof ErroDeValidacao) {
        concluir(erro.erros.pergunta
          ? "Escreva uma pergunta entre 3 e 300 caracteres."
          : "Corrija os campos do simulador antes de perguntar.");
        return;
      }
      concluir(descreverErro(erro));
    },
  });

  function perguntar(texto) {
    const pergunta = texto.trim();
    campo.value = pergunta;
    const cenario = obterCenario();
    if (pergunta.length < 3) {
      status.textContent = "Escreva uma pergunta, por exemplo: Um desconto de R$ 5 se paga?";
      campo.focus();
      return;
    }
    if (!cenario) {
      status.textContent = "Aguarde o cálculo do cenário atual ou corrija os campos do simulador.";
      return;
    }
    botao.disabled = true;
    botao.textContent = "Calculando…";
    status.textContent = "Calculando a resposta com o simulador…";
    executor.executar({ pergunta, cenario });
  }

  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    perguntar(campo.value);
  });
  const exemplos = document.getElementById("assistente-exemplos");
  exemplos.replaceChildren(...EXEMPLOS.map(exemplo => {
    const opcao = criar("button", { type: "button", className: "botao", textContent: exemplo });
    opcao.addEventListener("click", () => perguntar(exemplo));
    return opcao;
  }));
}
