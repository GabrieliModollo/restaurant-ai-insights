import { analisarPromocao, descreverErro, ErroDeValidacao } from "./api.js";
import { criarExecutor } from "./execucao.js";
import { textoLimites, validarCampo } from "./formulario.js";
import { linhasDaPromocao, textosDoEquilibrio } from "./promocoes.js";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function renderizar(resultado, elemento) {
  const textos = textosDoEquilibrio(resultado);
  const indicadores = criar("dl", { className: "promocao-metricas" });
  for (const [rotulo, valor] of [
    ["Diferença por pedido", textos.unitario],
    ["Conclusões mínimas para compensar", textos.minimo],
    ["Adicionais sobre conclusões da base", textos.adicionais],
    ["Diferença total nesta hipótese", textos.total],
  ]) indicadores.append(criar("div", {}, criar("dt", { textContent: rotulo }), criar("dd", { textContent: valor })));
  const tabela = criar("table", { className: "tabela-comparacao tabela-promocao" },
    criar("caption", { textContent: "Base A e hipótese promocional · contribuição do turno completo" }),
    criar("thead", {}, criar("tr", {}, ...["Indicador", "Base A", "Promoção", "Diferença", "Variação (%)"].map(
      textContent => criar("th", { scope: "col", textContent }),
    ))),
    criar("tbody", {}, ...linhasDaPromocao(resultado).map(linha => criar("tr", {},
      criar("th", { scope: "row", textContent: linha.rotulo }),
      ...[linha.base, linha.promocao, linha.diferenca, linha.percentual].map((textContent, i) => {
        const celula = criar("td", { textContent });
        celula.dataset.rotulo = ["Base A", "Promoção", "Diferença", "Variação (%)"][i];
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
  const partes = [indicadores, criar("p", { className: "promocao-conclusao", textContent: resultado.equilibrio.explicacao })];
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
  const controles = ["desconto", "pedidos"].map(nome => ({
    nome, entrada: document.getElementById(`promocao-${nome}`),
    erro: document.getElementById(`promocao-erro-${nome}`),
    limite: document.getElementById(`promocao-limite-${nome}`),
  }));
  let base = null, atual = null, campos = [], assinatura = "", disponivel = false;
  function mensagem(texto) { status.textContent = texto; }
  function cancelar() {
    executor.cancelar(); resultado.hidden = true;
    resultado.setAttribute("aria-busy", "false");
    botao.disabled = !disponivel;
    botao.textContent = "Analisar promoção";
  }
  const executor = criarExecutor({
    buscar: analisarPromocao,
    aoResultado(dados) {
      renderizar(dados, resultado);
      resultado.hidden = false; resultado.setAttribute("aria-busy", "false");
      botao.disabled = !disponivel; botao.textContent = "Analisar promoção";
      mensagem("Análise concluída para esta hipótese. Os parâmetros do simulador e o cenário A foram mantidos.");
    },
    aoErro(erro) {
      cancelar();
      mensagem(erro instanceof ErroDeValidacao
        ? `Confira os parâmetros: ${Object.entries(erro.erros).map(([chave, texto]) => {
          const [cenario, nome] = chave.split(".");
          const campo = campos.find(c => c.nome === nome);
          return `${cenario === "base" ? "Base A" : "Promoção"}${campo ? ` — ${campo.rotulo}` : ""}: ${texto}`;
        }).join(" ")}`
        : `${descreverErro(erro)} Tente Analisar promoção novamente.`);
    },
  });
  for (const controle of controles) controle.entrada.addEventListener("input", () => {
    cancelar(); mensagem("Hipótese alterada. Clique em Analisar promoção para recalcular.");
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
    if (primeiroInvalido) { cancelar(); mensagem("Corrija os campos indicados."); primeiroInvalido.focus(); return; }
    botao.disabled = true; botao.textContent = "Analisando…";
    resultado.hidden = true; resultado.setAttribute("aria-busy", "true");
    mensagem("Calculando contribuição e verificando o limite operacional…");
    executor.executar({ base: base.parametros, promocional });
  });
  return {
    atualizar(novaBase, novoAtual, atualizado, novosCampos) {
      const estavaDisponivel = disponivel;
      base = novaBase; atual = novoAtual; campos = novosCampos;
      disponivel = Boolean(base && atual && atualizado && campos.length);
      grupo.hidden = !base;
      botao.disabled = !disponivel;
      if (!disponivel) {
        if (!base) assinatura = "";
        cancelar(); mensagem(!base ? "Guarde o cenário A acima para usá-lo como base da promoção." : "Aguarde o cenário atual ficar válido e atualizado para analisar.");
        return;
      }
      const novaAssinatura = JSON.stringify([base.parametros, atual.parametros]);
      const preco = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(atual.parametros.preco_venda);
      document.getElementById("promocao-referencia").textContent = `Base A: ${base.resultado.operacao.pedidos_concluidos} pedidos concluídos. Promoção: preço original de ${preco} e turno de ${atual.parametros.duracao_turno_min} min, antes do desconto abaixo.`;
      if (novaAssinatura !== assinatura) {
        assinatura = novaAssinatura;
        cancelar();
        for (const controle of controles) {
          const campo = campos.find(c => c.nome === controle.nome);
          controle.entrada.value = atual.parametros[controle.nome];
          controle.entrada.min = campo.minimo; controle.entrada.max = campo.maximo;
          controle.entrada.step = campo.casas === 0 ? "1" : String(10 ** -campo.casas);
          controle.limite.textContent = textoLimites(campo, campo.maximo_campo ? "Preço de venda" : undefined);
          controle.erro.textContent = ""; controle.entrada.removeAttribute("aria-invalid");
        }
        mensagem("Base: cenário A. Hipótese: cenário atual, com desconto e volume ajustáveis abaixo. Clique em Analisar promoção.");
      } else if (!estavaDisponivel) {
        mensagem("Cenário atual pronto. Clique em Analisar promoção para conferir sua hipótese.");
      }
    },
  };
}
