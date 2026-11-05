// Desenha a cena no Canvas. Recebe tudo pronto: não calcula regras nem conhece a página.

import {
  ESTACOES_NA_CENA,
  PISO,
  posicionarRotulos,
  posicoesDaEquipe,
  posicoesDeItens,
  silhueta,
} from "./geometria.js";
import { textosDaCena } from "./modelo.js";

const MEIO_ITEM = 0.2;
const ALTURA_ITEM = 0.26;
const NIVEIS_DA_PILHA = 3;
const MEIO_CORPO = 0.15;
const ALTURA_CORPO = 0.42;

function poligono(ctx, pontos, cor) {
  ctx.beginPath();
  ctx.moveTo(pontos[0].px, pontos[0].py);
  for (const ponto of pontos.slice(1)) {
    ctx.lineTo(ponto.px, ponto.py);
  }
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
}

function caixa(ctx, t, { x, y, z = 0 }, meio, altura, cores) {
  const canto = (dx, dy, nivel) => t.paraTela({ x: x + dx * meio, y: y + dy * meio, z: nivel });
  const topo = z + altura;

  poligono(ctx, [canto(-1, 1, topo), canto(1, 1, topo), canto(1, 1, z), canto(-1, 1, z)], cores.a);
  poligono(ctx, [canto(1, -1, topo), canto(1, 1, topo), canto(1, 1, z), canto(1, -1, z)], cores.b);
  poligono(
    ctx,
    [canto(-1, -1, topo), canto(1, -1, topo), canto(1, 1, topo), canto(-1, 1, topo)],
    cores.topo,
  );
}

function desenharPiso(ctx, t, cores) {
  const { lado } = PISO;
  poligono(
    ctx,
    [
      t.paraTela({ x: 0, y: 0 }),
      t.paraTela({ x: lado, y: 0 }),
      t.paraTela({ x: lado, y: lado }),
      t.paraTela({ x: 0, y: lado }),
    ],
    cores.piso,
  );

  ctx.strokeStyle = cores.pisoLinha;
  ctx.lineWidth = 1;
  for (let i = 0; i <= lado; i += 2) {
    for (const [de, para] of [
      [{ x: i, y: 0 }, { x: i, y: lado }],
      [{ x: 0, y: i }, { x: lado, y: i }],
    ]) {
      const a = t.paraTela(de);
      const b = t.paraTela(para);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }
  }
}

function coresDoItem(cores) {
  return { a: cores.itemLadoA, b: cores.itemLadoB, topo: cores.itemTopo };
}

function desenharItens(ctx, t, grupo, centro, z, cores) {
  const lugares = grupo.individuais + (grupo.agrupados > 0 ? 1 : 0);
  posicoesDeItens(centro, lugares, z).forEach((posicao, indice) => {
    const niveis = indice < grupo.individuais ? 1 : NIVEIS_DA_PILHA;
    for (let nivel = 0; nivel < niveis; nivel += 1) {
      caixa(
        ctx,
        t,
        { ...posicao, z: z + nivel * ALTURA_ITEM },
        MEIO_ITEM,
        ALTURA_ITEM,
        coresDoItem(cores),
      );
    }
  });
}

function desenharPessoa(ctx, t, posicao, ocupada, cores) {
  caixa(ctx, t, posicao, MEIO_CORPO, ALTURA_CORPO, {
    a: cores.pessoaLadoA,
    b: cores.pessoaLadoB,
    topo: cores.pessoaTopo,
  });

  const cabeca = t.paraTela({ ...posicao, z: ALTURA_CORPO + 0.14 });
  ctx.beginPath();
  ctx.arc(cabeca.px, cabeca.py, Math.max(2, 0.14 * t.escala), 0, Math.PI * 2);
  ctx.fillStyle = cores.pessoaTopo;
  ctx.fill();

  if (ocupada) {
    // Quem está atendendo carrega um pedido: a diferença não depende só da cor.
    caixa(ctx, t, { x: posicao.x + 0.2, y: posicao.y + 0.2, z: 0.2 }, 0.1, 0.14, coresDoItem(cores));
  }
}

function desenharEquipe(ctx, t, equipe, centro, cores) {
  const lugares = equipe.ocupadasVisiveis + equipe.livresVisiveis + (equipe.agrupadas > 0 ? 1 : 0);
  posicoesDaEquipe(centro, lugares).forEach((posicao, indice) => {
    if (indice < equipe.ocupadasVisiveis) {
      desenharPessoa(ctx, t, posicao, true, cores);
    } else if (indice < equipe.ocupadasVisiveis + equipe.livresVisiveis) {
      desenharPessoa(ctx, t, posicao, false, cores);
    } else {
      // Grupo: duas figuras juntas representam as demais pessoas da equipe.
      const grupoAtendendo = equipe.ocupadas > equipe.ocupadasVisiveis;
      desenharPessoa(ctx, t, { ...posicao, x: posicao.x - 0.14 }, grupoAtendendo, cores);
      desenharPessoa(ctx, t, { ...posicao, y: posicao.y + 0.14 }, grupoAtendendo, cores);
    }
  });
}

function desenharBlocoDaEstacao(ctx, t, estacao, cores) {
  caixa(ctx, t, estacao.centro, estacao.meioLado, estacao.altura, {
    a: cores.blocoLadoA,
    b: cores.blocoLadoB,
    topo: cores.blocoTopo,
  });
}

function destacarSelecao(ctx, t, estacao, cores) {
  const contorno = silhueta(estacao, t);
  ctx.beginPath();
  ctx.moveTo(contorno[0].px, contorno[0].py);
  for (const ponto of contorno.slice(1)) {
    ctx.lineTo(ponto.px, ponto.py);
  }
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = cores.destaque;
  ctx.setLineDash([6, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function desenharRotulos(ctx, rotulos, cores) {
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  for (const rotulo of rotulos) {
    ctx.fillStyle = cores.fundoRotulo;
    ctx.fillRect(rotulo.esquerda, rotulo.topo, rotulo.largura, rotulo.altura);
    rotulo.linhas.forEach((linha, indice) => {
      ctx.font = `${indice === 0 ? 700 : 500} ${rotulo.fonte}px ${cores.fonte}`;
      ctx.fillStyle = cores.texto;
      ctx.fillText(
        linha,
        rotulo.esquerda + rotulo.largura / 2,
        rotulo.topo + indice * rotulo.alturaDaLinha + 1,
      );
    });
  }
}

function desenharLegenda(ctx, duracao, desatualizada, largura, cores) {
  const fonte = largura < 480 ? 10 : 12;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `700 ${fonte}px ${cores.fonte}`;
  ctx.fillStyle = cores.texto;
  ctx.fillText(`Fim do turno · minuto ${new Intl.NumberFormat("pt-BR").format(duracao)}`, 6, 6);
  if (desatualizada) {
    ctx.fillStyle = cores.alerta;
    ctx.fillText("Último cenário válido", 6, 6 + fonte + 3);
  }
}

export function desenharCena(
  ctx,
  { modelo, transformacao: t, largura, altura, selecionada, desatualizada, cores },
) {
  const { preparo, embalagem } = modelo.estacoes;
  const posicoes = ESTACOES_NA_CENA;

  ctx.clearRect(0, 0, largura, altura);
  desenharPiso(ctx, t, cores);

  desenharItens(ctx, t, preparo.fila, posicoes.fila_preparo.centro, 0, cores);
  desenharBlocoDaEstacao(ctx, t, posicoes.preparo, cores);
  desenharItens(ctx, t, embalagem.fila, posicoes.fila_embalagem.centro, 0, cores);
  desenharBlocoDaEstacao(ctx, t, posicoes.embalagem, cores);
  desenharBlocoDaEstacao(ctx, t, posicoes.retirada, cores);
  desenharItens(ctx, t, modelo.retirada, posicoes.retirada.centro, posicoes.retirada.altura, cores);

  if (selecionada) {
    destacarSelecao(ctx, t, posicoes[selecionada], cores);
  }

  desenharEquipe(ctx, t, preparo.equipe, posicoes.preparo.centro, cores);
  desenharEquipe(ctx, t, embalagem.equipe, posicoes.embalagem.centro, cores);

  desenharRotulos(
    ctx,
    posicionarRotulos(textosDaCena(modelo, selecionada), t, largura, altura),
    cores,
  );
  desenharLegenda(ctx, modelo.duracao, desatualizada, largura, cores);
}
