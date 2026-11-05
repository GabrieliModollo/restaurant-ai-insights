// Mostra o resultado calculado pelo servidor. Só formata; não recalcula nada.

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const NOMES_ESTACOES = { preparo: "Preparo", embalagem: "Embalagem" };

const DIAGNOSTICOS = {
  sem_fila: {
    rotulo: "Sem fila",
    explicacao: "Nenhum pedido precisou esperar nesta estação.",
  },
  fila_temporaria: {
    rotulo: "Fila sem sobrecarga comprovada",
    explicacao: "Houve espera, mas os dados não comprovam sobrecarga nesta estação.",
  },
  gargalo_observado: {
    rotulo: "Gargalo observado",
    explicacao: "Os pedidos chegam mais rápido do que a estação atende, e sobrou fila no fim do turno.",
  },
};

function definirTexto(id, texto) {
  document.getElementById(id).textContent = texto;
}

function definirMoeda(id, centavos) {
  const elemento = document.getElementById(id);
  elemento.textContent = moeda.format(centavos / 100);
  elemento.classList.toggle("valor-negativo", centavos < 0);
}

function minutos(valor) {
  return `${numero.format(valor)} min`;
}

export function textoMedia(valor) {
  return valor === null ? "Sem pedidos concluídos" : minutos(valor);
}

function definirMedia(id, valor) {
  const elemento = document.getElementById(id);
  elemento.textContent = textoMedia(valor);
  elemento.classList.toggle("valor-texto", valor === null);
}

function plural(quantidade, singular, pluralTexto) {
  return `${numero.format(quantidade)} ${quantidade === 1 ? singular : pluralTexto}`;
}

export function criarCartaoEstacao(nome, estacao, temMenorCapacidade) {
  const diagnostico = DIAGNOSTICOS[estacao.diagnostico];
  const cartao = document.createElement("article");
  cartao.className = "estacao";

  const titulo = document.createElement("h3");
  titulo.textContent = NOMES_ESTACOES[nome];

  const equipe = document.createElement("p");
  equipe.className = "estacao-equipe";
  equipe.textContent = `${plural(estacao.pessoas, "pessoa", "pessoas")} · ${minutos(estacao.tempo_por_pedido_min)} por pedido`;

  const etiquetas = document.createElement("div");
  etiquetas.className = "etiquetas";
  const etiquetaDiagnostico = document.createElement("span");
  etiquetaDiagnostico.className = `etiqueta etiqueta-${estacao.diagnostico}`;
  etiquetaDiagnostico.textContent = diagnostico.rotulo;
  etiquetas.append(etiquetaDiagnostico);
  if (temMenorCapacidade) {
    const etiquetaCapacidade = document.createElement("span");
    etiquetaCapacidade.className = "etiqueta";
    etiquetaCapacidade.textContent = "Menor capacidade";
    etiquetas.append(etiquetaCapacidade);
  }

  const explicacao = document.createElement("p");
  explicacao.className = "estacao-explicacao";
  explicacao.textContent = diagnostico.explicacao;

  const dados = document.createElement("dl");
  const linhas = [
    ["Capacidade teórica no turno", plural(estacao.capacidade_teorica_turno, "pedido", "pedidos")],
    ["Capacidade teórica por hora", `${numero.format(estacao.capacidade_teorica_hora)} pedidos`],
    ["Finalizados na estação", numero.format(estacao.finalizados)],
    ["Em atendimento no fim", numero.format(estacao.em_atendimento_final)],
    ["Na fila no fim", numero.format(estacao.fila_final)],
    ["Maior fila no turno", numero.format(estacao.fila_maxima)],
  ];
  for (const [rotulo, valor] of linhas) {
    const linha = document.createElement("div");
    const termo = document.createElement("dt");
    termo.textContent = rotulo;
    const definicao = document.createElement("dd");
    definicao.textContent = valor;
    linha.append(termo, definicao);
    dados.append(linha);
  }

  cartao.append(titulo, equipe, etiquetas, explicacao, dados);
  return cartao;
}

export function renderizarResultado({ financeiro, operacao }) {
  definirMoeda("contribuicao-total", financeiro.contribuicao_total_centavos);
  definirMoeda("contribuicao-por-pedido", financeiro.contribuicao_por_pedido_centavos);
  definirMoeda("receita-atendida", financeiro.receita_atendida_centavos);
  definirMoeda("preco-liquido", financeiro.preco_liquido_centavos);
  definirMoeda("taxa-canal", financeiro.taxa_canal_centavos);
  definirTexto(
    "nota-contribuicao",
    financeiro.contribuicao_por_pedido_centavos < 0
      ? "Negativa: cada pedido concluído reduz a contribuição"
      : "Líquido − taxa − ingredientes − embalagem",
  );

  const { pendentes } = operacao;
  const naFila = pendentes.fila_preparo + pendentes.fila_embalagem;
  const emAtendimento = pendentes.em_preparo + pendentes.em_embalagem;
  definirTexto("pedidos-recebidos", numero.format(operacao.pedidos_recebidos));
  definirTexto("pedidos-concluidos", numero.format(operacao.pedidos_concluidos));
  definirTexto("pedidos-pendentes", numero.format(operacao.pedidos_pendentes));
  definirTexto(
    "nota-pendentes",
    `${numero.format(naFila)} na fila · ${numero.format(emAtendimento)} em atendimento`,
  );
  definirMedia("espera-media", operacao.espera_media_fila_min);
  definirMedia("tempo-medio", operacao.tempo_total_medio_min);

  document.getElementById("estacoes").replaceChildren(
    ...Object.entries(operacao.estacoes).map(([nome, estacao]) =>
      criarCartaoEstacao(nome, estacao, operacao.estacoes_menor_capacidade.includes(nome)),
    ),
  );
}
