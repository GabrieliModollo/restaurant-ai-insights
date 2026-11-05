// Liga a cena à página: tamanho do Canvas, clique, botões, reprodução, detalhe e avisos.

import { criarCartaoEstacao } from "../indicadores.js";
import { estacaoEm } from "./deteccao.js";
import { desenharCena } from "./desenho.js";
import { alturaDaCena, criarTransformacao } from "./geometria.js";
import { criarLinhaDoTempo } from "./linha-do-tempo.js";
import { criarModeloCena, descreverCena, textoDoMinuto } from "./modelo.js";
import { criarReproducao } from "./reproducao.js";

const AVISO_ULTIMO_CENARIO = "A cena mostra o último cenário válido, não os parâmetros atuais.";
const AVISO_CALCULANDO = "Calculando… a cena ainda mostra o último cenário válido.";
const DICA_SEM_SELECAO = "Selecione uma estação na cena ou nos botões para ver os dados dela.";
const DESCRICAO_TOCANDO = "Reprodução em andamento. Pause para ouvir a descrição deste momento.";

const numero = new Intl.NumberFormat("pt-BR");

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

function linhaDeDados(rotulo, valor) {
  const linha = document.createElement("div");
  const termo = document.createElement("dt");
  termo.textContent = rotulo;
  const definicao = document.createElement("dd");
  definicao.textContent = valor;
  linha.append(termo, definicao);
  return linha;
}

function criarCartaoDoMomento(estacao, minuto, duracao) {
  const cartao = document.createElement("article");
  cartao.className = "estacao";

  const titulo = document.createElement("h3");
  titulo.textContent = `${estacao.titulo} no minuto ${textoDoMinuto(minuto)} de ${numero.format(duracao)}`;

  const dados = document.createElement("dl");
  dados.append(
    linhaDeDados(
      `Pessoas ${estacao.verbo}`,
      `${numero.format(estacao.equipe.ocupadas)} de ${numero.format(estacao.equipe.total)}`,
    ),
    linhaDeDados("Pedidos na fila", numero.format(estacao.fila.total)),
    linhaDeDados("Pedidos já finalizados aqui", numero.format(estacao.finalizados)),
  );

  cartao.append(titulo, dados);
  return cartao;
}

export function criarCena() {
  const quadro = document.getElementById("cena-quadro");
  const canvas = document.getElementById("cena");
  const textoEstado = document.getElementById("cena-estado");
  const detalhe = document.getElementById("cena-detalhe");
  const botoes = [...document.querySelectorAll("[data-estacao]")];
  const botaoAlternar = document.getElementById("reproducao-alternar");
  const botaoReiniciar = document.getElementById("reproducao-reiniciar");
  const botaoAnterior = document.getElementById("reproducao-anterior");
  const botaoProxima = document.getElementById("reproducao-proxima");
  const botaoFim = document.getElementById("reproducao-fim");
  const campoVelocidade = document.getElementById("reproducao-velocidade");
  const blocoVelocidade = document.getElementById("reproducao-bloco-velocidade");
  const controleTempo = document.getElementById("reproducao-tempo");
  const relogio = document.getElementById("reproducao-relogio");
  const anuncio = document.getElementById("reproducao-anuncio");
  const dicaMovimento = document.getElementById("reproducao-dica-movimento");
  const ctx = canvas.getContext("2d");
  const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

  let operacao = null;
  let linhaDoTempo = null;
  let momento = null;
  let modelo = null;
  let selecionada = null;
  let situacao = "calculando";
  let largura = 0;
  let altura = 0;
  let densidade = 0;
  let transformacao = null;
  let minutoDesenhado = null;
  let estavaTocando = false;

  const reproducao = criarReproducao({
    agendar: (funcao) => window.requestAnimationFrame(funcao),
    cancelar: (id) => window.cancelAnimationFrame(id),
    aoAtualizar: aoMudarRelogio,
  });

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

  // Só redesenha quando algo muda: não há repetição contínua fora da reprodução.
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
    if (!selecionada || !operacao || !modelo) {
      const dica = document.createElement("p");
      dica.className = "cena-dica";
      dica.textContent = DICA_SEM_SELECAO;
      detalhe.replaceChildren(dica);
      return;
    }
    const aviso = document.createElement("p");
    aviso.className = "cena-rotulo-turno";
    aviso.textContent = "Turno completo: os dados abaixo não mudam com o relógio.";

    detalhe.replaceChildren(
      criarCartaoDoMomento(modelo.estacoes[selecionada], modelo.minuto, modelo.duracao),
      aviso,
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
    textoEstado.dataset.atual = String(situacao === "atualizado");
    if (situacao === "calculando") {
      textoEstado.textContent = AVISO_CALCULANDO;
    } else if (situacao !== "atualizado" || !modelo) {
      textoEstado.textContent = AVISO_ULTIMO_CENARIO;
    } else if (modelo.ehFim) {
      textoEstado.textContent = `A cena mostra o fim do turno (minuto ${numero.format(modelo.duracao)}). Os indicadores abaixo são do turno completo.`;
    } else {
      textoEstado.textContent = `A cena mostra o minuto ${Math.floor(modelo.minuto)} de ${numero.format(modelo.duracao)}. Os indicadores abaixo são do turno completo, não deste momento.`;
    }
  }

  function textoDoRelogio() {
    return `Minuto ${textoDoMinuto(reproducao.minuto)} de ${numero.format(reproducao.duracao)}`;
  }

  function mostrarControles() {
    const { tocando, minuto, duracao } = reproducao;
    if (tocando) {
      botaoAlternar.textContent = "Pausar";
    } else {
      botaoAlternar.textContent = minuto > 0 && minuto < duracao ? "Continuar" : "Iniciar";
    }
    relogio.textContent = textoDoRelogio();
    controleTempo.value = String(minuto);
    // Enquanto toca, nada disto é anunciado: um leitor de tela não precisa de cada quadro.
    if (!tocando) {
      controleTempo.setAttribute("aria-valuetext", textoDoRelogio());
    }
    detalhe.setAttribute("aria-live", tocando ? "off" : "polite");
  }

  function anunciarParada() {
    if (estavaTocando && !reproducao.tocando) {
      anuncio.textContent = modelo.ehFim
        ? "Fim do turno."
        : `Pausado. ${textoDoRelogio()}.`;
    }
    estavaTocando = reproducao.tocando;
  }

  function aoMudarRelogio() {
    if (!linhaDoTempo) {
      return;
    }
    const minuto = reproducao.minuto;
    const novoMomento = linhaDoTempo.estadoEm(minuto);
    const minutoInteiro = Math.floor(minuto);
    const mudouACena = novoMomento !== momento || minutoInteiro !== minutoDesenhado;
    const parado = !reproducao.tocando;

    mostrarControles();

    // Redesenha só quando há algo novo para mostrar, e não a cada quadro do relógio.
    if (mudouACena || parado) {
      momento = novoMomento;
      minutoDesenhado = minutoInteiro;
      modelo = criarModeloCena(operacao, momento, minuto);
      mostrarEstado();
      mostrarDetalhe();
      desenhar();
    }
    canvas.setAttribute("aria-label", parado ? descreverCena(modelo) : DESCRICAO_TOCANDO);
    anunciarParada();
  }

  function aplicarPreferenciaDeMovimento() {
    const reduzir = menosMovimento.matches;
    if (reduzir) {
      reproducao.pausar();
    }
    // Com menos movimento, o acompanhamento é por etapas, sem o relógio correndo sozinho.
    botaoAlternar.hidden = reduzir;
    blocoVelocidade.hidden = reduzir;
    dicaMovimento.hidden = !reduzir;
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

  botaoAlternar.addEventListener("click", () => reproducao.alternar());
  botaoReiniciar.addEventListener("click", () => reproducao.reiniciar());
  botaoFim.addEventListener("click", () => reproducao.irPara(reproducao.duracao));
  botaoProxima.addEventListener("click", () => {
    reproducao.irPara(linhaDoTempo.proximoInstante(reproducao.minuto));
  });
  botaoAnterior.addEventListener("click", () => {
    reproducao.irPara(linhaDoTempo.instanteAnterior(reproducao.minuto));
  });
  campoVelocidade.addEventListener("change", () => {
    reproducao.definirVelocidade(Number(campoVelocidade.value));
  });
  controleTempo.addEventListener("input", () => reproducao.irPara(Number(controleTempo.value)));

  // Ao voltar de outra aba, a reprodução continua pausada, sem saltar.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      reproducao.pausar();
    }
  });

  new ResizeObserver(ajustarTamanho).observe(quadro);
  window.addEventListener("resize", ajustarTamanho); // o zoom muda a densidade de pixels
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", desenhar);
  menosMovimento.addEventListener("change", aplicarPreferenciaDeMovimento);

  aplicarPreferenciaDeMovimento();
  mostrarDetalhe();

  return {
    atualizar(novaOperacao) {
      operacao = novaOperacao;
      linhaDoTempo = criarLinhaDoTempo(operacao.eventos, operacao.duracao_turno_min);
      momento = null;
      estavaTocando = false;
      controleTempo.max = String(operacao.duracao_turno_min);
      ajustarTamanho();
      // Cenário novo: a reprodução anterior para e o relógio volta ao início.
      reproducao.carregar(operacao.duracao_turno_min);
    },
    definirEstado(novaSituacao) {
      situacao = novaSituacao;
      mostrarEstado();
      desenhar();
    },
  };
}
