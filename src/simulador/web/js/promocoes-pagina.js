import { analisarPromocao, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";
import { textoLimites, validarCampo } from "./formulario.js";
import { linhasDaPromocao, textosDoEquilibrio } from "./promocoes.js";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function renderizar(resultado, elemento, { aplicarDesconto, ajustarEquipe, rotuloBase }) {
  const textos = textosDoEquilibrio(resultado);
  const indicadores = criar("dl", { className: "promocao-metricas" });
  for (const [rotulo, valor] of [
    ["Diferença por pedido", textos.unitario],
    ["Conclusões mínimas para compensar", textos.minimo],
    ["Adicionais sobre conclusões da base", textos.adicionais],
    ["Diferença total nesta hipótese", textos.total],
  ]) indicadores.append(criar("div", {}, criar("dt", { textContent: rotulo }), criar("dd", { textContent: valor })));
  const colunas = [rotuloBase, "Promoção", "Diferença", "Variação (%)"];
  const tabela = criar("table", { className: "tabela-comparacao tabela-promocao" },
    criar("caption", { textContent: `${rotuloBase} e hipótese promocional · contribuição do turno completo` }),
    criar("thead", {}, criar("tr", {}, ...["Indicador", ...colunas].map(
      textContent => criar("th", { scope: "col", textContent }),
    ))),
    criar("tbody", {}, ...linhasDaPromocao(resultado).map(linha => criar("tr", {},
      criar("th", { scope: "row", textContent: linha.rotulo }),
      ...[linha.base, linha.promocao, linha.diferenca, linha.percentual].map((textContent, i) => {
        const celula = criar("td", { textContent });
        celula.dataset.rotulo = colunas[i];
        return celula;
      }),
    ))),
  );
  const formula = criar("details", { className: "ajuda" }, criar("summary", { textContent: "Como estes números são calculados?" }),
    criar("ul", {}, ...resultado.formulas.map(textContent => criar("li", { textContent }))),
  );
  const detalhamento = criar("details", {
    className: "promocao-detalhamento", open: !window.matchMedia("(max-width:700px)").matches,
  }, criar("summary", { textContent: "Comparação financeira lado a lado" }),
    criar("p", { className: "dica", textContent: "A variação usa o valor da base sem o sinal. Se a base for zero, o percentual não é definido." }), tabela);
  const partes = [
    criar("p", { className: "promocao-conclusao", textContent: textos.conclusao }),
    indicadores,
  ];
  const maximo = resultado.equilibrio.desconto_maximo_centavos;
  const concluidos = resultado.promocional.pedidos_concluidos;
  const alternativas = criar("section", { className: "promocao-alternativas" },
    criar("h3", { textContent: "Alternativas para testar" }),
    criar("p", { textContent: textos.descontoMaximo !== null
      ? `Com os ${concluidos} pedidos concluídos desta hipótese, o maior desconto que mantém a contribuição de referência é ${textos.descontoMaximo} por pedido.`
      : concluidos
        ? "Neste volume, mesmo sem desconto a contribuição fica abaixo da referência."
        : "O desconto máximo só pode ser estimado quando há pedidos concluídos." }),
  );
  if (maximo != null && maximo < resultado.promocional.desconto_centavos) {
    const aplicar = criar("button", { className: "botao", type: "button", textContent: "Testar desconto máximo" });
    aplicar.addEventListener("click", () => aplicarDesconto(maximo));
    alternativas.append(aplicar);
  }
  if (!resultado.equilibrio.atingiu_na_hipotese) {
    const equipe = criar("button", { className: "botao", type: "button", textContent: "Testar outra equipe" });
    equipe.addEventListener("click", ajustarEquipe);
    alternativas.append(equipe);
  }
  partes.push(alternativas);
  if (textos.intervalo) partes.push(criar("p", { className: "resumo-atencao", textContent: textos.intervalo }));
  partes.push(criar("p", { className: "dica", textContent:
    `No limite de ${resultado.equilibrio.limite_pedidos_recebidos} pedidos recebidos, este modelo conclui no máximo ${resultado.equilibrio.maximo_concluidos_no_limite} com a equipe, os tempos e o turno promocionais. Não é previsão nem meta de pedidos recebidos.` }),
    criar("ul", { className: "promocao-alertas" }, ...resultado.alertas.map(textContent => criar("li", { textContent }))),
    detalhamento, formula, criar("p", { className: "nota-rodape", textContent: resultado.identificacao }),
  );
  elemento.replaceChildren(...partes);
}

export function criarAnalisePromocoes() {
  const formulario = document.getElementById("promocao-formulario");
  const status = document.getElementById("promocao-status");
  const resultado = document.getElementById("promocao-resultado");
  const botao = document.getElementById("promocao-analisar");
  const grupo = document.getElementById("promocao-controles");
  const equipe = document.getElementById("promocao-equipe");
  const referencia = document.getElementById("promocao-referencia");
  const controles = ["desconto", "pedidos", "pessoas_preparo", "pessoas_embalagem"].map(nome => ({
    nome, entrada: document.getElementById(`promocao-${nome}`),
    erro: document.getElementById(`promocao-erro-${nome}`),
    limite: document.getElementById(`promocao-limite-${nome}`),
  }));
  let base = null;
  let atual = null;
  let campos = [];
  let assinatura = "";
  let disponivel = false;
  let rotuloBase = "Base A";
  function mensagem(texto) {
    status.textContent = texto;
  }
  function cancelar() {
    executor.cancelar();
    resultado.hidden = true;
    resultado.setAttribute("aria-busy", "false");
    botao.disabled = !disponivel;
    botao.textContent = "Analisar promoção";
  }
  const executor = criarExecutor({
    buscar: analisarPromocao,
    aoResultado(dados) {
      renderizar(dados, resultado, {
        rotuloBase,
        aplicarDesconto(centavos) {
          const desconto = controles[0].entrada;
          desconto.value = (centavos / 100).toFixed(2);
          desconto.focus();
          formulario.requestSubmit();
        },
        ajustarEquipe() {
          equipe.open = true;
          document.getElementById("promocao-pessoas_preparo").focus();
        },
      });
      resultado.hidden = false;
      resultado.setAttribute("aria-busy", "false");
      botao.disabled = !disponivel;
      botao.textContent = "Analisar promoção";
      mensagem("Análise concluída.");
    },
    aoErro(erro) {
      cancelar();
      mensagem(erro instanceof ErroDeValidacao
        ? `Confira os parâmetros: ${Object.entries(erro.erros).map(([chave, texto]) => {
          const [cenario, nome] = chave.split(".");
          const campo = campos.find(c => c.nome === nome);
          return `${cenario === "base" ? rotuloBase : "Promoção"}${campo ? ` — ${campo.rotulo}` : ""}: ${texto}`;
        }).join(" ")}`
        : `${descreverErro(erro)} Tente Analisar promoção novamente.`);
    },
  });
  for (const controle of controles) controle.entrada.addEventListener("input", () => {
    cancelar();
    mensagem("Hipótese alterada. Clique em Analisar promoção para recalcular.");
  });
  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!disponivel) return;
    const promocional = { ...atual.parametros };
    let primeiroInvalido = null;
    for (const controle of controles) {
      const campo = campos.find(c => c.nome === controle.nome);
      const erro = validarCampo(campo, controle.entrada.value, atual.parametros);
      controle.erro.textContent = erro || "";
      controle.entrada.setAttribute("aria-invalid", String(Boolean(erro)));
      if (erro) primeiroInvalido ||= controle.entrada;
      promocional[controle.nome] = Number(controle.entrada.value);
    }
    if (primeiroInvalido) {
      cancelar();
      mensagem("Corrija os campos indicados.");
      if (equipe.contains(primeiroInvalido)) equipe.open = true;
      primeiroInvalido.focus();
      return;
    }
    botao.disabled = true;
    botao.textContent = "Analisando…";
    resultado.hidden = true;
    resultado.setAttribute("aria-busy", "true");
    mensagem("Calculando contribuição e verificando o limite operacional…");
    executor.executar({ base: base.parametros, promocional });
  });
  return {
    atualizar(novaBase, novoAtual, atualizado, novosCampos, exemplo = false) {
      const estavaDisponivel = disponivel;
      base = novaBase;
      atual = novoAtual;
      campos = novosCampos;
      rotuloBase = exemplo ? "Turno de referência" : "Base A";
      disponivel = Boolean(base && atual && atualizado && campos.length);
      grupo.hidden = !base;
      botao.disabled = !disponivel;
      if (!disponivel) {
        if (!base) assinatura = "";
        cancelar();
        mensagem(!base ? "Guarde o cenário A acima para usá-lo como base da promoção." : "Aguarde o cenário atual ficar válido e atualizado para analisar.");
        return;
      }
      const novaAssinatura = JSON.stringify([exemplo, base.parametros, atual.parametros]);
      const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(atual.parametros.preco_venda);
      referencia.textContent = exemplo
        ? `Exemplo fictício · preço original de ${preco} · turno de ${atual.parametros.duracao_turno_min} min.`
        : `Base A: ${base.resultado.operacao.pedidos_concluidos} pedidos concluídos. Promoção: preço original de ${preco} e turno de ${atual.parametros.duracao_turno_min} min.`;
      if (novaAssinatura !== assinatura) {
        assinatura = novaAssinatura;
        cancelar();
        equipe.open = false;
        for (const controle of controles) {
          const campo = campos.find(c => c.nome === controle.nome);
          controle.entrada.value = atual.parametros[controle.nome];
          controle.entrada.min = campo.minimo;
          controle.entrada.max = campo.maximo;
          controle.entrada.step = campo.casas === 0 ? "1" : String(10 ** -campo.casas);
          controle.limite.textContent = textoLimites(campo, campo.maximo_campo ? "Preço de venda" : undefined);
          controle.erro.textContent = "";
          controle.entrada.removeAttribute("aria-invalid");
        }
        mensagem(exemplo
          ? "Altere os valores para testar outra hipótese."
          : "Base: cenário A. Ajuste os valores abaixo e clique em Analisar promoção.");
      } else if (!estavaDisponivel) {
        mensagem("Cenário atual pronto. Clique em Analisar promoção para conferir sua hipótese.");
      }
    },
    analisarExemplo() {
      equipe.open = false;
      for (const { nome, entrada } of controles) entrada.value = atual.parametros[nome];
      formulario.requestSubmit();
    },
  };
}
