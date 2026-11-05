// Traduz o momento do relógio no que a cena mostra. Não recalcula regras operacionais:
// só decide quantos itens desenhar um a um e quantos agrupar, sem perder os totais.

export const LIMITE_ITENS = 9;
export const LIMITE_PESSOAS = 6;

const TITULOS = { preparo: "Preparo", embalagem: "Embalagem" };
const VERBOS = { preparo: "preparando", embalagem: "embalando" };
const numero = new Intl.NumberFormat("pt-BR");

export function agrupar(total, limite) {
  if (total <= limite) {
    return { total, individuais: total, agrupados: 0 };
  }
  // O último lugar vira uma pilha, que representa todos os itens restantes.
  return { total, individuais: limite - 1, agrupados: total - limite + 1 };
}

function criarEquipe(pessoas, emAtendimento) {
  const ocupadas = emAtendimento;
  const livres = pessoas - emAtendimento;
  const lugares = pessoas > LIMITE_PESSOAS ? LIMITE_PESSOAS - 1 : LIMITE_PESSOAS;
  const ocupadasVisiveis = Math.min(ocupadas, lugares);
  const livresVisiveis = Math.min(livres, lugares - ocupadasVisiveis);

  return {
    total: pessoas,
    ocupadas,
    livres,
    ocupadasVisiveis,
    livresVisiveis,
    agrupadas: pessoas - ocupadasVisiveis - livresVisiveis,
  };
}

function criarEstacao(nome, dados, momento) {
  return {
    nome,
    titulo: TITULOS[nome],
    verbo: VERBOS[nome],
    diagnostico: dados.diagnostico,
    fila: agrupar(momento.fila[nome], LIMITE_ITENS),
    equipe: criarEquipe(dados.pessoas, momento.atendendo[nome]),
    finalizados: momento.finalizados[nome],
  };
}

export function criarModeloCena(operacao, momento, minuto) {
  const duracao = operacao.duracao_turno_min;
  return {
    minuto,
    duracao,
    ehFim: minuto >= duracao,
    estacoes: {
      preparo: criarEstacao("preparo", operacao.estacoes.preparo, momento),
      embalagem: criarEstacao("embalagem", operacao.estacoes.embalagem, momento),
    },
    retirada: agrupar(momento.finalizados.embalagem, LIMITE_ITENS),
  };
}

// Mostra uma casa decimal sem arredondar para cima: o minuto exibido nunca adianta o relógio.
export function textoDoMinuto(minuto) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    Math.floor(minuto * 10) / 10,
  );
}

function textosDaEstacao(estacao, selecionada, ehFim) {
  const titulo = estacao.nome === selecionada ? `▶ ${estacao.titulo}` : estacao.titulo;
  const { ocupadas, total } = estacao.equipe;
  const linhas = [
    titulo,
    `${numero.format(ocupadas)} de ${numero.format(total)}`,
    total === 1 ? "pessoa" : "pessoas",
    estacao.verbo,
  ];
  // O gargalo descreve o turno completo, então não aparece no meio da reprodução.
  if (ehFim && estacao.diagnostico === "gargalo_observado") {
    linhas.push("Gargalo");
  }
  return { ancora: estacao.nome, linhas };
}

// Os totais escritos são sempre os exatos, mesmo quando o desenho agrupa os itens.
export function textosDaCena(modelo, selecionada) {
  const { preparo, embalagem } = modelo.estacoes;
  return [
    textosDaEstacao(preparo, selecionada, modelo.ehFim),
    textosDaEstacao(embalagem, selecionada, modelo.ehFim),
    { ancora: "fila_preparo", linhas: [`Fila ${numero.format(preparo.fila.total)}`] },
    { ancora: "fila_embalagem", linhas: [`Fila ${numero.format(embalagem.fila.total)}`] },
    {
      ancora: "retirada",
      linhas: [`${numero.format(modelo.retirada.total)} pedidos`, "prontos para", "retirada"],
    },
  ];
}

function descreverEstacao({ titulo, verbo, equipe, fila }) {
  const pessoas = `${numero.format(equipe.total)} ${equipe.total === 1 ? "pessoa" : "pessoas"}`;
  return `${titulo}: ${pessoas}, ${numero.format(equipe.ocupadas)} ${verbo}, ${numero.format(fila.total)} na fila.`;
}

export function descreverCena(modelo) {
  const { preparo, embalagem } = modelo.estacoes;
  const momento = modelo.ehFim
    ? `Restaurante ao fim do turno, minuto ${numero.format(modelo.duracao)}.`
    : `Restaurante no minuto ${textoDoMinuto(modelo.minuto)} de ${numero.format(modelo.duracao)}.`;
  return [
    momento,
    descreverEstacao(preparo),
    descreverEstacao(embalagem),
    `Retirada: ${numero.format(modelo.retirada.total)} pedidos prontos para retirada.`,
  ].join(" ");
}
