// Liga as partes: mudança no formulário → validação → API → indicadores.

import { buscarCampos, buscarExemplos, descreverErro, ErroDeValidacao, simular } from "./api.js";
import { criarCena } from "./cena/pagina.js";
import { criarComparacao } from "./comparacao-pagina.js";
import { criarExecutor } from "./execucao.js";
import { criarExemplos } from "./exemplos.js";
import { criarFormulario } from "./formulario.js";
import { renderizarResultado } from "./indicadores.js";
import { criarNavegacao } from "./navegacao.js";

const ESPERA_ANTES_DE_CALCULAR_MS = 200;
const AVISO_ULTIMO_CENARIO = "Os indicadores mostrados são do último cenário válido.";

const status = document.getElementById("status");
const resultados = document.getElementById("resultados");
const botaoRepetir = document.getElementById("tentar-novamente");
const cena = criarCena();
const comparacao = criarComparacao();

let formulario;
let temporizador;
let repetir = null;

function definirStatus(estado, texto) {
  status.dataset.estado = estado;
  status.textContent = texto;
  resultados.dataset.desatualizado = String(estado === "desatualizado" || estado === "erro");
  resultados.setAttribute("aria-busy", String(estado === "calculando"));
  botaoRepetir.hidden = estado !== "erro";
  cena.definirEstado(estado);
  comparacao.definirSituacao(estado);
}

function mostrarFalha(erro, acaoDeRepetir) {
  repetir = acaoDeRepetir;
  const complemento = resultados.hidden ? "" : ` ${AVISO_ULTIMO_CENARIO}`;
  definirStatus("erro", `${descreverErro(erro)}${complemento}`);
}

const executor = criarExecutor({
  // Parâmetros e resultado viajam juntos: o cenário A nunca mistura dados de pedidos diferentes.
  buscar: async (parametros, signal) => ({
    parametros,
    resultado: await simular(parametros, signal),
  }),
  aoResultado({ parametros, resultado }) {
    renderizarResultado(resultado);
    resultados.hidden = false;
    cena.atualizar(resultado.operacao);
    comparacao.registrar(parametros, resultado);
    definirStatus("atualizado", "Indicadores calculados pelo servidor para os parâmetros atuais.");
  },
  aoErro(erro) {
    if (erro instanceof ErroDeValidacao) {
      formulario.mostrarErros(erro.erros);
      const motivo = erro.erros.corpo ?? "O servidor rejeitou os parâmetros.";
      definirStatus("desatualizado", `${motivo} ${AVISO_ULTIMO_CENARIO}`);
      return;
    }
    mostrarFalha(erro, agendarSimulacao);
  },
});

function agendarSimulacao() {
  clearTimeout(temporizador);
  executor.cancelar();

  if (!formulario.validar()) {
    definirStatus("desatualizado", `Corrija os campos destacados. ${AVISO_ULTIMO_CENARIO}`);
    return;
  }

  definirStatus("calculando", "Calculando…");
  temporizador = setTimeout(
    () => executor.executar(formulario.valores()),
    ESPERA_ANTES_DE_CALCULAR_MS,
  );
}

async function iniciar() {
  definirStatus("calculando", "Carregando…");
  try {
    const campos = await buscarCampos();
    formulario = criarFormulario(
      document.getElementById("formulario"),
      campos,
      agendarSimulacao,
    );
    comparacao.definirCampos(campos);
    agendarSimulacao();
  } catch (erro) {
    mostrarFalha(erro, iniciar);
    return;
  }

  // Os exemplos são um complemento: se não carregarem, o simulador continua funcionando.
  try {
    criarExemplos(await buscarExemplos(), formulario);
  } catch {
    document.getElementById("exemplos").hidden = true;
  }
}

criarNavegacao();

botaoRepetir.addEventListener("click", () => {
  status.focus(); // o botão some ao repetir, e quem usa o teclado não pode perder a posição
  repetir?.();
});

iniciar();
