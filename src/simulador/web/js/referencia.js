import { descreverErro, ErroDeValidacao, importarReferencia } from "./api.js";
import { criarExecutor } from "./execucao.js";

const numero = new Intl.NumberFormat("pt-BR");
const dataBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const LIMITE_CSV = 128 * 1024;

export function iniciarReferencia() {
  const formulario = document.getElementById("referencia-formulario");
  const arquivo = document.getElementById("referencia-arquivo");
  const status = document.getElementById("referencia-status");
  const resultado = document.getElementById("referencia-resultado");
  const origem = document.getElementById("referencia-origem");
  const totais = document.getElementById("referencia-totais");
  const horas = document.getElementById("referencia-horas");

  const executor = criarExecutor({
    async buscar({ fonte, local }, signal) {
      const csv = local
        ? new TextDecoder("utf-8", { fatal: true }).decode(await local.arrayBuffer())
        : await carregarExemplo(signal);
      return { dados: await importarReferencia({ csv }, signal), fonte };
    },
    aoResultado({ dados, fonte }) {
      origem.textContent = fonte;
      const periodo = dataBr.formatRange(new Date(dados.inicio), new Date(dados.fim));
      totais.textContent = `${periodo} · ${numero.format(dados.dias_com_dados)} dia(s) com dados · ` +
        `${numero.format(dados.concluidos)} concluídos e ${numero.format(dados.cancelados)} cancelados`;
      horas.replaceChildren(...dados.por_hora.map(({ hora, concluidos, cancelados }) => {
        const linha = document.createElement("tr");
        for (const texto of [String(hora).padStart(2, "0") + "h", numero.format(concluidos), numero.format(cancelados)]) {
          linha.insertCell().textContent = texto;
        }
        return linha;
      }));
      resultado.hidden = false;
      status.textContent = "Dados de referência carregados.";
    },
    aoErro(erro) {
      status.textContent = erro instanceof ErroDeValidacao ? erro.erros.csv ?? "Confira o formato do CSV."
        : erro instanceof TypeError ? "Não foi possível ler o exemplo ou o arquivo UTF-8." : descreverErro(erro);
    },
  });

  function limpar() {
    executor.cancelar();
    resultado.hidden = true;
    status.textContent = "";
  }

  function carregar(entrada) {
    limpar();
    status.textContent = "Lendo dados de referência…";
    executor.executar(entrada);
  }

  arquivo.addEventListener("change", limpar);
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    limpar();
    const local = arquivo.files[0];
    if (!local || !local.name.toLowerCase().endsWith(".csv") || local.size === 0 || local.size > LIMITE_CSV) {
      status.textContent = "Escolha um arquivo .csv com conteúdo e até 128 KB.";
      return;
    }
    carregar({ fonte: "Origem: arquivo local selecionado", local });
  });
  document.getElementById("referencia-exemplo").addEventListener("click", () => {
    arquivo.value = "";
    carregar({ fonte: "Origem: exemplo sintético do Restaurant AI Insights" });
  });
}

async function carregarExemplo(signal) {
  const resposta = await fetch("exemplos/referencia-sintetica.csv", { signal });
  if (!resposta.ok) throw new TypeError("CSV de exemplo indisponível.");
  return resposta.text();
}
