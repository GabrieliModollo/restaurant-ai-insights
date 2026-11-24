import { descreverErro, ErroDeValidacao, reabrirCenario } from "./api.js";
import { criarExecutor } from "./execucao.js";

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const reais = centavos => dinheiro.format(centavos / 100);
const LIMITE_ARQUIVO = 64 * 1024;

function linhasDoResumo({ arquivo, campos, promocao, ficha, alternativas, canais, pico }) {
  function turno(titulo, chave) {
    const resultado = promocao[chave];
    return [titulo, campos.map(({ nome, rotulo, unidade }) => {
      const valor = arquivo[chave][nome];
      return `${rotulo}: ${unidade === "R$" ? dinheiro.format(valor) : numero.format(valor) + " " + unidade}`;
    }).concat([
      `Pedidos prontos: ${resultado.pedidos_concluidos} de ${resultado.pedidos_recebidos}`,
      `Contribuição do turno: ${reais(resultado.contribuicao_total_centavos)}`,
    ])];
  }

  const grupos = [turno("Cenário de referência", "base"), turno("Hipótese de promoção", "promocional")];
  if (ficha) {
    grupos.push(["Ficha técnica", [
      ...arquivo.ficha.ingredientes.map(item =>
        `${item.nome}: ${reais(item.preco_compra_centavos)} por ${item.quantidade_comprada} ${item.unidade_compra}; ` +
        `uso de ${item.quantidade_usada} ${item.unidade_uso} por porção; preço de ${item.data_preco}.`),
      `Custo da ficha por porção: ${reais(ficha.total_centavos)}. O cálculo do turno usa o custo por pedido informado na hipótese.`,
    ]]);
  }
  if (alternativas) {
    const { estacao, desconto_menor_centavos } = arquivo.alternativas;
    const menor = alternativas.desconto_menor;
    const equipe = alternativas.reforco_equipe;
    grupos.push(["Alternativas de desconto e equipe", [
      `Desconto de ${reais(desconto_menor_centavos)}: ${menor.pedidos_prontos} pedidos prontos e ${reais(menor.resultado_ajustado_centavos)} no turno.`,
      `Reforço no ${estacao === "pessoas_preparo" ? "preparo" : "setor de embalagem"}: ${equipe.pedidos_prontos} pedidos prontos, ` +
      `custo adicional de ${reais(equipe.custo_adicional_centavos)} e resultado ajustado de ${reais(equipe.resultado_ajustado_centavos)}.`,
    ]]);
  }
  if (canais) {
    grupos.push(["Comparação por canal", [["A", canais.canal_a], ["B", canais.canal_b]].map(([nome, canal]) =>
      `Canal ${nome}: comissão de ${numero.format(canal.comissao_bps / 100)}%, taxa de pagamento de ${numero.format(canal.pagamento_bps / 100)}%, ` +
      `frete da loja de ${reais(canal.frete_loja_centavos)}, desconto da loja de ${reais(canal.desconto_loja_centavos)}, ` +
      `subsídio de ${reais(canal.subsidio_plataforma_centavos)} e contribuição de ${reais(canal.contribuicao_total_centavos)} no turno.`)]);
  }
  if (pico) {
    grupos.push(["Chegadas distribuídas e pico", [["Ao longo do turno", pico.distribuido], ["No pico", pico.pico]].map(([nome, dados]) =>
      `${nome}: chegadas em ${numero.format(dados.janela_chegadas_min)} min, ${dados.pedidos_prontos} prontos, ${dados.pedidos_pendentes} pendentes. ` +
      `Maior fila: ${dados.fila_maxima_preparo} no preparo e ${dados.fila_maxima_embalagem} na embalagem. ` +
      `Espera média em fila: ${dados.espera_media_fila_min === null ? "sem pedidos prontos" : numero.format(dados.espera_media_fila_min) + " min"}.`)]);
  }
  grupos.push(["Custos e limites", [
    "A contribuição considera descontos, taxas do canal, ingredientes e embalagem. A comparação por canal também considera o frete pago pela loja.",
    "O custo adicional da equipe entra apenas no resultado ajustado do reforço. Impostos, salários regulares, aluguel, desperdício e pedidos não concluídos ficam fora da contribuição.",
    "Os pedidos recebidos representam uma hipótese de demanda.",
  ]]);
  return grupos;
}

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function baixarResumo(dados) {
  const secoes = linhasDoResumo(dados).map(([titulo, linhas]) => [titulo, ...linhas].join("\n"));
  baixar("resumo-do-cenario.txt", ["Restaurant AI Insights", ...secoes].join("\n\n") + "\n", "text/plain;charset=utf-8");
}

export function iniciarCenarioSalvo(obterHipotese, obterFicha) {
  const arquivo = document.getElementById("cenario-arquivo");
  const status = document.getElementById("cenario-arquivo-status");
  const resultado = document.getElementById("cenario-arquivo-resultado");
  const resumo = document.getElementById("cenario-arquivo-resumo");
  let reaberto = null;
  const executor = criarExecutor({
    async buscar({ entrada, exportando }, signal) {
      const valores = exportando ? entrada : JSON.parse(await entrada.text());
      return { dados: await reabrirCenario(valores, signal), exportando };
    },
    aoResultado({ dados, exportando }) {
      if (exportando) {
        baixarResumo(dados);
        status.textContent = "Resumo exportado.";
        return;
      }
      reaberto = dados;
      resumo.replaceChildren(...linhasDoResumo(dados).map(([titulo, linhas]) => {
        const secao = document.createElement("section");
        const cabecalho = document.createElement("h3");
        cabecalho.textContent = titulo;
        const lista = document.createElement("ul");
        for (const texto of linhas) {
          const item = document.createElement("li");
          item.textContent = texto;
          lista.append(item);
        }
        secao.append(cabecalho, lista);
        return secao;
      }));
      resultado.hidden = false;
      status.textContent = "Cenário reaberto e recalculado.";
    },
    aoErro(erro) {
      status.textContent = erro instanceof SyntaxError || erro instanceof ErroDeValidacao
        ? "Arquivo inválido ou incompatível. Use um JSON exportado pelo simulador."
        : descreverErro(erro);
    },
  });

  function atual() {
    executor.cancelar();
    const hipotese = obterHipotese();
    if (!hipotese) {
      status.textContent = "Analise ou recalcule a promoção antes de exportar.";
      return null;
    }
    return { versao: 1, ...hipotese, ficha: obterFicha() ?? null };
  }

  document.getElementById("cenario-baixar").addEventListener("click", () => {
    const dados = atual();
    if (!dados) return;
    baixar("cenario-restaurante.json", JSON.stringify(dados, null, 2), "application/json");
    status.textContent = "Cenário baixado.";
  });
  document.getElementById("cenario-resumir").addEventListener("click", () => {
    const dados = atual();
    if (!dados) return;
    status.textContent = "Preparando resumo…";
    executor.executar({ entrada: dados, exportando: true });
  });
  arquivo.addEventListener("change", () => {
    executor.cancelar();
    reaberto = null;
    resultado.hidden = true;
    status.textContent = "";
  });
  document.getElementById("cenario-reabrir").addEventListener("submit", evento => {
    evento.preventDefault();
    const entrada = arquivo.files[0];
    if (!entrada || !entrada.name.toLowerCase().endsWith(".json") || entrada.size > LIMITE_ARQUIVO) {
      status.textContent = "Escolha um arquivo .json de até 64 KB.";
      return;
    }
    status.textContent = "Recalculando cenário…";
    executor.executar({ entrada, exportando: false });
  });
  document.getElementById("cenario-resumo-arquivo").addEventListener("click", () => {
    if (reaberto) baixarResumo(reaberto);
  });
}
