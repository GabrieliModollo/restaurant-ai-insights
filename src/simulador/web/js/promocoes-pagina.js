import { criarComparacaoCanais } from "./canais.js";
import { criarComparacaoAlternativas } from "./alternativas.js";
import { criarComparacaoPico } from "./pico.js";
import { analisarPromocao, explicarPromocao, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";
import { textoLimites, validarCampo } from "./formulario.js";
import { linhasDaPromocao, textosDoEquilibrio } from "./promocoes.js";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function criarExplicacao(hipotese) {
  const botao = criar("button", { type: "button", className: "botao", textContent: "Explicar este resultado" });
  const texto = criar("p", { className: "dica", hidden: true });
  const status = criar("p", { className: "dica", role: "status" });
  const secao = criar("div", { className: "promocao-explicacao" }, botao, status, texto);
  const motivos = {
    desativada: "Explicação por regras · IA local desativada.",
    indisponivel: "Explicação por regras · Ollama indisponível.",
    resposta_invalida: "Explicação por regras · o modelo não retornou os dados esperados.",
  };
  const executor = criarExecutor({
    buscar: explicarPromocao,
    aoResultado(dados) {
      botao.setAttribute("aria-disabled", "false");
      status.textContent = dados.origem === "ia_local"
        ? `Explicação gerada por IA local · ${dados.modelo}`
        : motivos[dados.motivo] ?? "Explicação por regras.";
      texto.textContent = dados.texto;
      texto.hidden = false;
    },
    aoErro(erro) {
      botao.setAttribute("aria-disabled", "false");
      status.textContent = erro.name === "TimeoutError"
        ? "A explicação demorou mais que o esperado. Você pode tentar de novo."
        : descreverErro(erro);
    },
  });
  botao.addEventListener("click", () => {
    if (botao.getAttribute("aria-disabled") === "true") return;
    botao.setAttribute("aria-disabled", "true");
    texto.hidden = true;
    status.textContent = "Preparando a explicação…";
    executor.executar(hipotese);
  });
  return { secao, cancelar: executor.cancelar };
}

function renderizar(resultado, elemento, { aplicarDesconto, ajustarEquipe, rotuloBase, explicacao, comparacao, canais, pico }) {
  const textos = textosDoEquilibrio(resultado);
  const indicadores = criar("dl", { className: "promocao-metricas" });
  for (const [rotulo, valor] of [
    ["Pedidos prontos necessários", textos.minimo],
    ["Capacidade do turno", `${resultado.equilibrio.maximo_concluidos_no_limite} pedidos`],
    ["Diferença no turno", textos.total],
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
    className: "promocao-detalhamento",
  }, criar("summary", { textContent: "Comparação financeira lado a lado" }),
    criar("p", { className: "dica", textContent: "A variação usa o valor da base sem o sinal. Se a base for zero, o percentual não é definido." }), tabela);
  const contribuicao = resultado.promocional.contribuicao_total_centavos;
  const negativa = resultado.base.contribuicao_total_centavos < 0 || contribuicao < 0;
  const turnosDiferentes = resultado.base.duracao_turno_min !== resultado.promocional.duracao_turno_min;
  const atingiu = resultado.equilibrio.atingiu_na_hipotese;
  const titulo = negativa
    ? contribuicao < 0 ? "Contribuição ainda negativa" : "Referência com contribuição negativa"
    : atingiu ? "A hipótese mantém a contribuição" : "Abaixo da referência";
  const resumo = criar("div", { className: "promocao-resumo" },
    criar("h2", {
      id: "promocao-titulo-resultado", tabIndex: -1, textContent: titulo,
    }),
    criar("p", { className: "promocao-conclusao", textContent: textos.conclusao }),
  );
  resumo.dataset.estado = atingiu && !negativa && !turnosDiferentes ? "favoravel" : "atencao";
  if (contribuicao < 0) {
    const valor = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(contribuicao / 100);
    resumo.append(criar("p", { textContent: "Contribuição da promoção: " + valor + "." }));
  }
  if (turnosDiferentes) {
    resumo.append(criar("p", { textContent: "Os turnos têm durações diferentes. Os totais cobrem períodos diferentes." }));
  }
  resumo.append(indicadores);
  const partes = [criar("p", { className: "dica", textContent:
    "Diferença por pedido: " + textos.unitario + ". Acima do volume concluído de referência: " + textos.adicionais + "." })];
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
  if (!negativa && maximo != null && maximo < resultado.promocional.desconto_centavos) {
    const aplicar = criar("button", { className: "botao", type: "button", textContent: "Testar desconto máximo" });
    aplicar.addEventListener("click", () => aplicarDesconto(maximo));
    alternativas.append(aplicar);
  }
  if (!resultado.equilibrio.atingiu_na_hipotese) {
    const equipe = criar("button", { className: "botao", type: "button", textContent: "Testar outra equipe" });
    equipe.addEventListener("click", ajustarEquipe);
    alternativas.append(equipe);
  }
  partes.push(alternativas, comparacao, canais, pico);
  if (textos.intervalo) partes.push(criar("p", { className: "resumo-atencao", textContent: textos.intervalo }));
  partes.push(criar("p", { className: "dica", textContent:
    `No limite de ${resultado.equilibrio.limite_pedidos_recebidos} pedidos recebidos, este modelo conclui no máximo ${resultado.equilibrio.maximo_concluidos_no_limite} com a equipe, os tempos e o turno promocionais. Não é previsão nem meta de pedidos recebidos.` }),
    criar("ul", { className: "promocao-alertas" }, ...resultado.alertas.map(textContent => criar("li", { textContent }))),
    explicacao, detalhamento, formula, criar("p", { className: "nota-rodape", textContent: resultado.identificacao }),
  );
  elemento.replaceChildren(resumo, criar("details", { id: "promocao-detalhes" },
    criar("summary", { textContent: "Ver detalhes e alternativas" }), ...partes,
  ));
}

export function criarAnalisePromocoes() {
  const formulario = document.getElementById("promocao-formulario");
  const status = document.getElementById("promocao-status");
  const resultado = document.getElementById("promocao-resultado");
  const botao = document.getElementById("promocao-analisar");
  const grupo = document.getElementById("promocao-controles");
  const ajustes = document.getElementById("promocao-ajustes");
  const aviso = document.getElementById("promocao-desatualizada");
  const painel = grupo.closest("section");
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
  let modo = null;
  let assinatura = "";
  let disponivel = false;
  let analisando = false;
  let cancelarDetalhes = null;
  const rascunhos = new Map();

  function mensagem(texto) {
    status.textContent = texto;
    status.hidden = !texto;
  }

  function liberarBotao() {
    analisando = false;
    resultado.setAttribute("aria-busy", "false");
    botao.setAttribute("aria-disabled", String(!disponivel));
    botao.textContent = "Analisar promoção";
  }

  function cancelar() {
    executor.cancelar();
    cancelarDetalhes?.();
    cancelarDetalhes = null;
    liberarBotao();
  }

  function desatualizar() {
    cancelar();
    aviso.hidden = resultado.hidden;
    resultado.dataset.desatualizado = String(!resultado.hidden);
  }

  function editar() {
    if (grupo.hidden) return;
    ajustes.open = true;
    controles[0].entrada.focus();
  }

  const executor = criarExecutor({
    async buscar(hipotese, signal) {
      return { dados: await analisarPromocao(hipotese, signal), hipotese };
    },
    aoResultado({ dados, hipotese }) {
      const explicacao = criarExplicacao(hipotese);
      const comparacao = criarComparacaoAlternativas(hipotese);
      const canais = criarComparacaoCanais(hipotese);
      const pico = criarComparacaoPico(hipotese.promocional);
      cancelarDetalhes = () => {
        explicacao.cancelar();
        comparacao.cancelar();
        canais.cancelar();
        pico.cancelar();
      };
      renderizar(dados, resultado, {
        explicacao: explicacao.secao,
        comparacao: comparacao.secao,
        canais: canais.secao,
        pico: pico.secao,
        rotuloBase: modo === "exemplo" ? "Turno de referência" : "Cenário A",
        aplicarDesconto(centavos) {
          editar();
          controles[0].entrada.value = (centavos / 100).toFixed(2);
          registrarEdicao();
          formulario.requestSubmit();
        },
        ajustarEquipe() {
          ajustes.open = true;
          equipe.open = true;
          document.getElementById("promocao-pessoas_preparo").focus();
        },
      });
      resultado.hidden = false;
      aviso.hidden = true;
      resultado.dataset.desatualizado = "false";
      liberarBotao();
      mensagem("");
      const podeMoverFoco = painel.contains(document.activeElement) && !painel.closest("[data-pagina]").hidden;
      const focoNosAjustes = ajustes.contains(document.activeElement);
      ajustes.open = false;
      if (podeMoverFoco && focoNosAjustes) {
        document.getElementById("promocao-titulo-resultado").focus();
      }
    },
    aoErro(erro) {
      liberarBotao();
      ajustes.open = true;
      mensagem(erro instanceof ErroDeValidacao
        ? `Confira os parâmetros: ${Object.entries(erro.erros).map(([chave, texto]) => {
          const [cenario, nome] = chave.split(".");
          const campo = campos.find(c => c.nome === nome);
          return `${cenario === "base" ? "Turno de referência" : "Promoção"}${campo ? ` — ${campo.rotulo}` : ""}: ${texto}`;
        }).join(" ")}`
        : `${descreverErro(erro)} Tente Analisar promoção novamente.`);
    },
  });

  function registrarEdicao() {
    rascunhos.set(modo, Object.fromEntries(controles.map(({ nome, entrada }) => [nome, entrada.value])));
    desatualizar();
    if (disponivel) mensagem("");
  }

  for (const controle of controles) controle.entrada.addEventListener("input", registrarEdicao);

  formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!disponivel || analisando) return;
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
      desatualizar();
      mensagem("Corrija os campos indicados.");
      ajustes.open = true;
      if (equipe.contains(primeiroInvalido)) equipe.open = true;
      primeiroInvalido.focus();
      return;
    }
    desatualizar();
    analisando = true;
    botao.setAttribute("aria-disabled", "true");
    botao.textContent = "Analisando…";
    resultado.setAttribute("aria-busy", "true");
    mensagem("Calculando contribuição e capacidade…");
    executor.executar({ base: base.parametros, promocional });
  });

  function preencherCampos(draft) {
    for (const controle of controles) {
      const campo = campos.find(c => c.nome === controle.nome);
      controle.entrada.value = draft?.[controle.nome] ?? atual.parametros[controle.nome];
      controle.entrada.min = campo.minimo;
      controle.entrada.max = campo.maximo;
      controle.entrada.step = campo.casas === 0 ? "1" : String(10 ** -campo.casas);
      controle.limite.textContent = textoLimites(campo, campo.maximo_campo ? "Preço de venda" : undefined);
      controle.erro.textContent = "";
      controle.entrada.removeAttribute("aria-invalid");
    }
  }

  return {
    atualizar(novaBase, novoAtual, atualizado, novosCampos, novoModo) {
      const mudouModo = modo !== novoModo;
      base = novaBase;
      atual = novoAtual;
      campos = novosCampos;
      modo = novoModo;
      const estavaDisponivel = disponivel;
      disponivel = Boolean(modo && base && atual && atualizado && campos.length);
      grupo.hidden = !modo || !base;
      if (mudouModo || !base) {
        resultado.hidden = true;
        aviso.hidden = true;
        assinatura = "";
        ajustes.open = false;
        equipe.open = false;
      }
      if (!disponivel) {
        desatualizar();
        mensagem(!modo
          ? "Escolha um exemplo fictício ou use seu cenário atual como referência."
          : !base ? "Escolha Testar minha promoção para guardar o cenário atual como referência."
            : "Aguarde o cenário atual ficar válido para analisar.");
        return;
      }
      const novaAssinatura = JSON.stringify([modo, base.parametros, atual.parametros]);
      if (novaAssinatura !== assinatura) {
        assinatura = novaAssinatura;
        desatualizar();
        preencherCampos(rascunhos.get(modo));
        const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(atual.parametros.preco_venda);
        referencia.textContent = modo === "exemplo"
          ? `Exemplo fictício · preço original de ${preco} · turno de ${atual.parametros.duracao_turno_min} min.`
          : `Referência: ${base.resultado.operacao.pedidos_concluidos} pedidos prontos. Promoção: preço de ${preco} e turno de ${atual.parametros.duracao_turno_min} min.`;
        mensagem("");
      } else if (!estavaDisponivel) {
        liberarBotao();
        mensagem("");
      }
    },
    editar,
    analisarExemplo() {
      if (!disponivel) return;
      rascunhos.delete("exemplo");
      preencherCampos();
      ajustes.open = false;
      equipe.open = false;
      desatualizar();
      formulario.requestSubmit();
    },
  };
}
