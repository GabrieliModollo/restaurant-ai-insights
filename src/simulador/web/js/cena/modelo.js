// Traduz o resultado do servidor no que a cena mostra. Não recalcula regras operacionais:
// só decide quantos itens desenhar um a um e quantos agrupar, sem perder os totais.

export const LIMITE_ITENS = 9;
export const LIMITE_PESSOAS = 6;

const NOMES = { preparo: "Preparo", embalagem: "Embalagem" };
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

function criarEstacao(nome, dados) {
  return {
    nome,
    titulo: NOMES[nome],
    diagnostico: dados.diagnostico,
    fila: agrupar(dados.fila_final, LIMITE_ITENS),
    equipe: criarEquipe(dados.pessoas, dados.em_atendimento_final),
  };
}

export function criarModeloCena(operacao) {
  return {
    duracao: operacao.duracao_turno_min,
    estacoes: {
      preparo: criarEstacao("preparo", operacao.estacoes.preparo),
      embalagem: criarEstacao("embalagem", operacao.estacoes.embalagem),
    },
    retirada: agrupar(operacao.pedidos_concluidos, LIMITE_ITENS),
  };
}

function textosDaEstacao(estacao, selecionada) {
  const titulo = estacao.nome === selecionada ? `▶ ${estacao.titulo}` : estacao.titulo;
  const { ocupadas, total } = estacao.equipe;
  const linhas = [titulo, `Atend. ${numero.format(ocupadas)}/${numero.format(total)}`];
  if (estacao.diagnostico === "gargalo_observado") {
    linhas.push("Gargalo");
  }
  return { ancora: estacao.nome, linhas };
}

// Os totais escritos são sempre os exatos, mesmo quando o desenho agrupa os itens.
export function textosDaCena(modelo, selecionada) {
  const { preparo, embalagem } = modelo.estacoes;
  return [
    textosDaEstacao(preparo, selecionada),
    textosDaEstacao(embalagem, selecionada),
    { ancora: "fila_preparo", linhas: [`Fila ${numero.format(preparo.fila.total)}`] },
    { ancora: "fila_embalagem", linhas: [`Fila ${numero.format(embalagem.fila.total)}`] },
    { ancora: "retirada", linhas: ["Retirada", `${numero.format(modelo.retirada.total)} prontos`] },
  ];
}

function descreverEstacao({ titulo, equipe, fila }) {
  const pessoas = `${numero.format(equipe.total)} ${equipe.total === 1 ? "pessoa" : "pessoas"}`;
  return `${titulo}: ${pessoas}, ${numero.format(equipe.ocupadas)} em atendimento, ${numero.format(fila.total)} na fila.`;
}

export function descreverCena(modelo) {
  const { preparo, embalagem } = modelo.estacoes;
  return [
    `Restaurante ao fim do turno, minuto ${numero.format(modelo.duracao)}.`,
    descreverEstacao(preparo),
    descreverEstacao(embalagem),
    `Retirada: ${numero.format(modelo.retirada.total)} pedidos prontos.`,
  ].join(" ");
}
