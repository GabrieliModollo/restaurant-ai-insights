// Liga a cena à página: tamanho do Canvas, clique, botões, detalhe da estação e aviso de estado.

import { criarCartaoEstacao } from "../indicadores.js";
import { estacaoEm } from "./deteccao.js";
import { desenharCena } from "./desenho.js";
import { alturaDaCena, criarTransformacao } from "./geometria.js";
import { criarModeloCena, descreverCena } from "./modelo.js";

const AVISO_ULTIMO_CENARIO = "A cena mostra o último cenário válido, não os parâmetros atuais.";
const AVISO_CALCULANDO = "Calculando… a cena ainda mostra o último cenário válido.";
const DICA_SEM_SELECAO = "Selecione uma estação na cena ou nos botões para ver os dados dela.";

function lerCores() {
  const estilo = getComputedStyle(document.documentElement);
  const cor = (nome) => estilo.getPropertyValue(`--cena-${nome}`).trim();
  return {
    piso: cor("piso"),
    pisoLinha: cor("piso-linha"),
    blocoTopo: cor("bloco-topo"),
    blocoLadoA: cor("bloco-a"),
    blocoLadoB: cor("bloco-b"),
    itemTopo: cor("item-topo"),
    itemLadoA: cor("item-a"),
    itemLadoB: cor("item-b"),
    pessoaTopo: cor("pessoa-topo"),
    pessoaLadoA: cor("pessoa-a"),
    pessoaLadoB: cor("pessoa-b"),
    fundoRotulo: cor("fundo-rotulo"),
    texto: estilo.getPropertyValue("--texto").trim(),
    destaque: estilo.getPropertyValue("--destaque").trim(),
    alerta: estilo.getPropertyValue("--alerta").trim(),
    fonte: getComputedStyle(document.body).fontFamily,
  };
}

export function criarCena() {
  const quadro = document.getElementById("cena-quadro");
  const canvas = document.getElementById("cena");
  const textoEstado = document.getElementById("cena-estado");
  const detalhe = document.getElementById("cena-detalhe");
  const botoes = [...document.querySelectorAll("[data-estacao]")];
  const ctx = canvas.getContext("2d");

  let operacao = null;
  let modelo = null;
  let selecionada = null;
  let situacao = "calculando";
  let largura = 0;
  let altura = 0;
  let densidade = 0;
  let transformacao = null;

  function desenhar() {
    if (!modelo || !transformacao) {
      return;
    }
    ctx.setTransform(densidade, 0, 0, densidade, 0, 0);
    desenharCena(ctx, {
      modelo,
      transformacao,
      largura,
      altura,
      selecionada,
      desatualizada: situacao !== "atualizado",
      cores: lerCores(),
    });
  }

  // Só redesenha quando algo muda: não há repetição contínua.
  function ajustarTamanho() {
    const novaLargura = quadro.clientWidth;
    const novaDensidade = window.devicePixelRatio || 1;
    if (novaLargura === 0 || (novaLargura === largura && novaDensidade === densidade)) {
      return;
    }
    largura = novaLargura;
    densidade = novaDensidade;
    altura = alturaDaCena(largura);
    canvas.style.height = `${altura}px`;
    canvas.width = Math.round(largura * densidade);
    canvas.height = Math.round(altura * densidade);
    transformacao = criarTransformacao(largura, altura);
    desenhar();
  }

  function mostrarDetalhe() {
    if (!selecionada || !operacao) {
      const dica = document.createElement("p");
      dica.className = "cena-dica";
      dica.textContent = DICA_SEM_SELECAO;
      detalhe.replaceChildren(dica);
      return;
    }
    detalhe.replaceChildren(
      criarCartaoEstacao(
        selecionada,
        operacao.estacoes[selecionada],
        operacao.estacoes_menor_capacidade.includes(selecionada),
      ),
    );
  }

  function selecionar(nome) {
    selecionada = nome;
    for (const botao of botoes) {
      botao.setAttribute("aria-pressed", String(botao.dataset.estacao === nome));
    }
    mostrarDetalhe();
    desenhar();
  }

  function pontoDoEvento(evento) {
    const limites = canvas.getBoundingClientRect();
    return { px: evento.clientX - limites.left, py: evento.clientY - limites.top };
  }

  function mostrarEstado() {
    if (situacao === "calculando") {
      textoEstado.textContent = AVISO_CALCULANDO;
    } else if (situacao === "atualizado" && modelo) {
      const minuto = new Intl.NumberFormat("pt-BR").format(modelo.duracao);
      textoEstado.textContent = `A cena mostra o estado ao fim do turno (minuto ${minuto}) do cenário atual.`;
    } else {
      textoEstado.textContent = AVISO_ULTIMO_CENARIO;
    }
    textoEstado.dataset.atual = String(situacao === "atualizado");
  }

  canvas.addEventListener("click", (evento) => {
    if (transformacao) {
      selecionar(estacaoEm(pontoDoEvento(evento), transformacao));
    }
  });
  canvas.addEventListener("mousemove", (evento) => {
    const sobreEstacao = transformacao && estacaoEm(pontoDoEvento(evento), transformacao);
    canvas.style.cursor = sobreEstacao ? "pointer" : "default";
  });
  for (const botao of botoes) {
    botao.addEventListener("click", () => {
      selecionar(selecionada === botao.dataset.estacao ? null : botao.dataset.estacao);
    });
  }

  new ResizeObserver(ajustarTamanho).observe(quadro);
  window.addEventListener("resize", ajustarTamanho); // o zoom muda a densidade de pixels
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", desenhar);

  mostrarDetalhe();

  return {
    atualizar(novaOperacao) {
      operacao = novaOperacao;
      modelo = criarModeloCena(novaOperacao);
      canvas.setAttribute("aria-label", descreverCena(modelo));
      ajustarTamanho();
      mostrarDetalhe();
      desenhar();
    },
    definirEstado(novaSituacao) {
      situacao = novaSituacao;
      mostrarEstado();
      desenhar();
    },
  };
}
