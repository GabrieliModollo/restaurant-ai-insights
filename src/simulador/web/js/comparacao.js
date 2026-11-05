// Guarda o cenário A e compara com o atual. Só informa diferenças absolutas: não usa percentuais,
// não julga se uma diferença é boa ou ruim e não aponta um cenário melhor.

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const SEM_MEDIA = "Sem pedidos concluídos";
const NAO_COMPARAVEL = "Não comparável";
const SINGULARES = { pessoas: "pessoa", pedidos: "pedido" };

function comSinal(diferenca, formatar) {
  if (diferenca === 0) {
    return formatar(0);
  }
  return `${diferenca > 0 ? "+" : "−"}${formatar(Math.abs(diferenca))}`;
}

const reais = (centavos) => moeda.format(centavos / 100);
const minutos = (valor) => `${numero.format(valor)} min`;
const quantidade = (valor) => numero.format(valor);

const INDICADORES = [
  {
    rotulo: "Pedidos concluídos",
    ler: (r) => r.operacao.pedidos_concluidos,
    formatar: quantidade,
  },
  {
    rotulo: "Pedidos pendentes",
    ler: (r) => r.operacao.pedidos_pendentes,
    formatar: quantidade,
  },
  {
    rotulo: "Receita atendida",
    ler: (r) => r.financeiro.receita_atendida_centavos,
    formatar: reais,
  },
  {
    rotulo: "Valor que sobra por pedido",
    ler: (r) => r.financeiro.contribuicao_por_pedido_centavos,
    formatar: reais,
  },
  {
    rotulo: "Valor que sobra no turno",
    ler: (r) => r.financeiro.contribuicao_total_centavos,
    formatar: reais,
  },
  {
    rotulo: "Espera média",
    ler: (r) => r.operacao.espera_media_fila_min,
    formatar: minutos,
    casas: 2,
  },
  {
    rotulo: "Tempo total médio",
    ler: (r) => r.operacao.tempo_total_medio_min,
    formatar: minutos,
    casas: 2,
  },
];

function diferencaDe(valorA, valorAtual, { formatar, casas = 0 }) {
  if (valorA === null || valorAtual === null) {
    return NAO_COMPARAVEL;
  }
  // Inteiros (centavos e pedidos) são exatos; as médias têm no máximo 2 casas.
  const fator = 10 ** casas;
  return comSinal(Math.round((valorAtual - valorA) * fator) / fator, formatar);
}

function compararIndicador(indicador, resultadoA, resultadoAtual) {
  const valorA = indicador.ler(resultadoA);
  const valorAtual = indicador.ler(resultadoAtual);
  const exibir = (valor) => (valor === null ? SEM_MEDIA : indicador.formatar(valor));
  return {
    rotulo: indicador.rotulo,
    a: exibir(valorA),
    atual: exibir(valorAtual),
    diferenca: diferencaDe(valorA, valorAtual, indicador),
  };
}

function valorDoParametro(valor, unidade) {
  const texto = numero.format(valor);
  if (unidade === "R$") {
    return `R$ ${texto}`;
  }
  if (unidade === "%") {
    return `${texto}%`;
  }
  return `${texto} ${valor === 1 ? (SINGULARES[unidade] ?? unidade) : unidade}`;
}

export function compararCenarios(cenarioA, cenarioAtual, campos) {
  const duracaoA = cenarioA.resultado.operacao.duracao_turno_min;
  const duracaoAtual = cenarioAtual.resultado.operacao.duracao_turno_min;

  return {
    periodoA: `Turno de ${numero.format(duracaoA)} min`,
    periodoAtual: `Turno de ${numero.format(duracaoAtual)} min`,
    duracoesDiferentes: duracaoA !== duracaoAtual,
    parametrosAlterados: campos
      .filter(({ nome }) => cenarioA.parametros[nome] !== cenarioAtual.parametros[nome])
      .map(({ nome, rotulo, unidade }) => ({
        rotulo,
        a: valorDoParametro(cenarioA.parametros[nome], unidade),
        atual: valorDoParametro(cenarioAtual.parametros[nome], unidade),
      })),
    indicadores: INDICADORES.map((indicador) =>
      compararIndicador(indicador, cenarioA.resultado, cenarioAtual.resultado),
    ),
  };
}

export function criarControleCenarioA() {
  let cenarioA = null;
  let ultimo = null;
  let atualizado = false;

  return {
    get a() {
      return cenarioA;
    },
    get ultimo() {
      return ultimo;
    },
    get atualizado() {
      return atualizado;
    },
    get podeSalvar() {
      return atualizado && ultimo !== null;
    },
    registrar(parametros, resultado) {
      ultimo = structuredClone({ parametros, resultado });
    },
    definirSituacao(situacao) {
      atualizado = situacao === "atualizado";
    },
    salvar() {
      if (!atualizado || !ultimo) {
        return false;
      }
      // Cópia independente. Os eventos ficam de fora: pesam e não são usados na comparação.
      cenarioA = structuredClone(ultimo);
      delete cenarioA.resultado.operacao.eventos;
      return true;
    },
    limpar() {
      cenarioA = null;
    },
  };
}
