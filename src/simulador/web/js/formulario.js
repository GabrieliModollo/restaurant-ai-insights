// Monta os controles a partir de /api/campos e valida antes de enviar.
// A validação aqui dá resposta imediata; a decisão final é sempre do servidor.

const numeroBr = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const GRUPOS_RECOLHIDOS = new Set(["Equipe e tempos"]);

function criarElemento(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

export function textoLimites(campo, rotuloDoLimite) {
  const minimo = numeroBr.format(campo.minimo);
  const maximo = numeroBr.format(campo.maximo);

  if (rotuloDoLimite) {
    const prefixo = campo.unidade === "R$" ? "R$ " : "";
    return `Limites: ${prefixo}${minimo} até o ${rotuloDoLimite.toLowerCase()}`;
  }
  if (campo.unidade === "R$") {
    return `Limites: R$ ${minimo} a R$ ${maximo}`;
  }
  if (campo.unidade === "%") {
    return `Limites: ${minimo}% a ${maximo}%`;
  }
  return `Limites: ${minimo} a ${maximo} ${campo.unidade}`;
}

function criarControle(campo, rotuloDoLimite) {
  const idNumero = `campo-${campo.nome}`;
  const idErro = `erro-${campo.nome}`;
  const idLimites = `limites-${campo.nome}`;
  const idDica = `dica-${campo.nome}`;

  const numero = criarElemento("input", {
    id: idNumero,
    name: campo.nome,
    type: "number",
    min: String(campo.minimo),
    max: String(campo.maximo),
    step: campo.casas === 0 ? "1" : String(campo.passo_slider),
    inputMode: campo.casas === 0 ? "numeric" : "decimal",
    required: true,
    value: String(campo.padrao),
  });
  numero.setAttribute(
    "aria-describedby",
    [idLimites, idErro, ...(campo.dica ? [idDica] : [])].join(" "),
  );

  // O slider cobre a faixa comum; digitando, é possível ir até o limite do campo.
  const passo = campo.passo_slider;
  const slider = criarElemento("input", {
    type: "range",
    min: String(Math.ceil(campo.minimo / passo) * passo),
    max: String(campo.maximo_slider),
    step: String(passo),
    value: String(campo.padrao),
  });
  slider.setAttribute("aria-label", `${campo.rotulo}, controle deslizante`);

  const erro = criarElemento("p", { id: idErro, className: "erro-campo" });
  const limites = criarElemento("p", {
    id: idLimites,
    className: "limites",
    textContent: textoLimites(campo, rotuloDoLimite),
  });

  const controle = criarElemento(
    "div",
    { className: "controle" },
    criarElemento("label", { htmlFor: idNumero, textContent: campo.rotulo }),
    criarElemento(
      "div",
      { className: "controle-entradas" },
      slider,
      criarElemento(
        "div",
        { className: "entrada-numero" },
        numero,
        criarElemento("span", { textContent: campo.unidade }),
      ),
    ),
    limites,
    erro,
  );
  if (campo.dica) {
    controle.append(
      criarElemento("p", { id: idDica, className: "dica", textContent: campo.dica }),
    );
  }

  return { campo, controle, numero, slider, erro };
}

export function validarCampo(campo, texto, valores) {
  if (texto.trim() === "") {
    return "Informe um número.";
  }

  const valor = Number(texto);
  if (!Number.isFinite(valor)) {
    return "Informe um número finito.";
  }
  if (valor < campo.minimo || valor > campo.maximo) {
    return `Use um valor entre ${numeroBr.format(campo.minimo)} e ${numeroBr.format(campo.maximo)}.`;
  }
  if (campo.casas === 0 && !Number.isInteger(valor)) {
    return "Use um número inteiro.";
  }
  if (campo.casas > 0 && (String(valor).split(".")[1] ?? "").length > campo.casas) {
    return `Use no máximo ${campo.casas} casas decimais.`;
  }
  if (campo.maximo_campo && Number.isFinite(valores[campo.maximo_campo])) {
    if (valor > valores[campo.maximo_campo]) {
      return "O desconto não pode ser maior que o preço.";
    }
  }
  return null;
}

export function criarFormulario(elemento, campos, aoAlterar) {
  const rotulos = Object.fromEntries(campos.map((campo) => [campo.nome, campo.rotulo]));
  const controles = campos.map((campo) => criarControle(campo, rotulos[campo.maximo_campo]));

  const grupos = new Map();
  for (const item of controles) {
    if (!grupos.has(item.campo.grupo)) {
      grupos.set(item.campo.grupo, []);
    }
    grupos.get(item.campo.grupo).push(item.controle);
  }
  for (const [nome, elementos] of grupos) {
    const grupo = criarElemento(
      "fieldset",
      {},
      criarElemento("legend", { textContent: nome }),
      ...elementos,
    );
    // Só o que tem um valor inicial razoável fica recolhido; os custos seguem sempre visíveis.
    elemento.append(
      GRUPOS_RECOLHIDOS.has(nome)
        ? criarElemento(
            "details",
            { className: "grupo-recolhido" },
            criarElemento("summary", {
              textContent: `${nome}: já preenchido, abra para ajustar`,
            }),
            grupo,
          )
        : grupo,
    );
  }

  for (const { numero, slider } of controles) {
    numero.addEventListener("input", () => {
      if (numero.value !== "") {
        slider.value = numero.value;
      }
      aoAlterar();
    });
    slider.addEventListener("input", () => {
      numero.value = slider.value;
      aoAlterar();
    });
  }
  elemento.addEventListener("submit", (evento) => evento.preventDefault());

  function valores() {
    return Object.fromEntries(
      controles.map(({ campo, numero }) => [campo.nome, Number(numero.value)]),
    );
  }

  function mostrarErros(erros) {
    for (const { campo, controle, numero, erro } of controles) {
      const mensagem = erros[campo.nome] ?? "";
      erro.textContent = mensagem;
      controle.dataset.invalido = String(Boolean(mensagem));
      numero.setAttribute("aria-invalid", String(Boolean(mensagem)));
      if (mensagem) {
        controle.closest("details")?.setAttribute("open", ""); // um erro nunca fica escondido
      }
    }
  }

  // Devolve true quando todos os campos estão válidos.
  function validar() {
    const atuais = valores();
    const erros = {};
    for (const { campo, numero } of controles) {
      const mensagem = validarCampo(campo, numero.value, atuais);
      if (mensagem) {
        erros[campo.nome] = mensagem;
      }
    }
    mostrarErros(erros);
    return Object.keys(erros).length === 0;
  }

  return { valores, validar, mostrarErros };
}
