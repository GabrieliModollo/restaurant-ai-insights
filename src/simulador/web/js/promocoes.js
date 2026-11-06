// Formatação dos dados da API; decisões de equilíbrio ficam no servidor.
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const reais = valor => moeda.format(valor / 100);
const percentual = valor => valor === null ? "Não definido (base zero)" : `${numero.format(valor)}%`;

export function linhasDaPromocao(resultado) {
  const campos = [
    ["Preço original", "preco_original_centavos", reais],
    ["Desconto por pedido", "desconto_centavos", reais],
    ["Preço com desconto", "preco_liquido_centavos", reais],
    ["Taxa do canal por pedido", "taxa_canal_centavos", reais],
    ["Ingredientes por pedido", "custo_ingredientes_centavos", reais],
    ["Embalagem por pedido", "custo_embalagem_centavos", reais],
    ["Contribuição por pedido", "contribuicao_por_pedido_centavos", reais],
    ["Pedidos recebidos (hipótese)", "pedidos_recebidos", numero.format],
    ["Pedidos concluídos no turno", "pedidos_concluidos", numero.format],
    ["Contribuição total", "contribuicao_total_centavos", reais],
  ];
  return campos.map(([rotulo, chave, formatar]) => {
    const base = resultado.base[chave], promocao = resultado.promocional[chave];
    const { absoluta, percentual: taxa } = resultado.diferencas[chave];
    const complemento = cenario => chave === "desconto_centavos"
      ? ` (${numero.format(cenario.desconto_pct)}%)`
      : chave === "taxa_canal_centavos" ? ` (${numero.format(cenario.taxa_canal_pct)}%)` : "";
    return {
      rotulo,
      base: formatar(base) + complemento(resultado.base),
      promocao: formatar(promocao) + complemento(resultado.promocional),
      diferenca: `${absoluta > 0 ? "+" : ""}${formatar(absoluta)}`,
      percentual: percentual(taxa),
    };
  });
}

export function textosDoEquilibrio(resultado) {
  const e = resultado.equilibrio;
  const minimo = e.pedidos_concluidos_minimos;
  const maximo = e.pedidos_concluidos_maximos;
  return {
    minimo: minimo === null ? "Sem volume que compense" : `${numero.format(minimo)} concluídos`,
    adicionais: e.adicionais_sobre_base === null ? "Não se aplica" : `${numero.format(e.adicionais_sobre_base)} concluídos a mais`,
    intervalo: maximo === null ? null : `Com contribuição negativa, no máximo ${numero.format(maximo)} conclusões mantêm o total igual ou acima da base. Mais pedidos pioram o resultado.`,
    unitario: reais(resultado.diferencas.contribuicao_por_pedido_centavos.absoluta),
    total: reais(resultado.diferencas.contribuicao_total_centavos.absoluta),
  };
}
