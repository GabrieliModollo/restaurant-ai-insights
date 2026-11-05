// Geometria da cena: projeção isométrica, posições no piso e encaixe no quadro.
// Só contas: aqui não há desenho nem regras do restaurante.

const COS30 = Math.sqrt(3) / 2;
const SEN30 = 0.5;

const LADO_DO_PISO = 12;
const LARGURA_DO_PISO = 2 * LADO_DO_PISO * COS30;
const ALTURA_DO_PISO = LADO_DO_PISO;
const MARGEM = 8;

const ALTURA_MINIMA_DA_CENA = 250;
const ALTURA_MAXIMA_DA_CENA = 430;
const PROPORCAO_DA_CENA = 0.58;

const ESPACO_ENTRE_ITENS = 0.55;
const ESPACO_ENTRE_PESSOAS = 0.5;
const DISTANCIA_DA_EQUIPE = 1.6;

// Tudo fica na diagonal x + y = 12, que aparece como uma linha reta horizontal na tela.
export const PISO = { lado: LADO_DO_PISO };

export const ESTACOES_NA_CENA = {
  fila_preparo: { centro: { x: 1.6, y: 10.4 }, meioLado: 0.75, altura: 0, rotulo: "abaixo" },
  preparo: { centro: { x: 3.8, y: 8.2 }, meioLado: 1.1, altura: 1.2, rotulo: "acima" },
  fila_embalagem: { centro: { x: 6, y: 6 }, meioLado: 0.75, altura: 0, rotulo: "abaixo" },
  embalagem: { centro: { x: 8.2, y: 3.8 }, meioLado: 1.1, altura: 1.2, rotulo: "acima" },
  retirada: { centro: { x: 10.4, y: 1.6 }, meioLado: 1, altura: 0.7, rotulo: "abaixo" },
};

export function projetar({ x, y, z = 0 }) {
  return { sx: (x - y) * COS30, sy: (x + y) * SEN30 - z };
}

// Inversa da projeção para um ponto no piso (z = 0).
export function desprojetar({ sx, sy }) {
  const diferenca = sx / COS30;
  const soma = sy / SEN30;
  return { x: (soma + diferenca) / 2, y: (soma - diferenca) / 2 };
}

export function alturaDaCena(largura) {
  const proporcional = Math.round(largura * PROPORCAO_DA_CENA);
  return Math.min(ALTURA_MAXIMA_DA_CENA, Math.max(ALTURA_MINIMA_DA_CENA, proporcional));
}

// Encaixa o piso no quadro, sem distorcer, e converte entre piso e pixels.
export function criarTransformacao(largura, altura) {
  const escala = Math.min(
    (largura - 2 * MARGEM) / LARGURA_DO_PISO,
    (altura - 2 * MARGEM) / ALTURA_DO_PISO,
  );
  const origemX = largura / 2;
  const origemY = (altura - ALTURA_DO_PISO * escala) / 2;

  return {
    escala,
    paraTela(ponto) {
      const { sx, sy } = projetar(ponto);
      return { px: origemX + sx * escala, py: origemY + sy * escala };
    },
    daTela({ px, py }) {
      return desprojetar({ sx: (px - origemX) / escala, sy: (py - origemY) / escala });
    },
  };
}

// Contorno de um bloco visto na tela: um hexágono formado pelos cantos da base e do topo.
export function silhueta({ centro, meioLado, altura }, transformacao) {
  const { x, y } = centro;
  const canto = (dx, dy, z) =>
    transformacao.paraTela({ x: x + dx * meioLado, y: y + dy * meioLado, z });

  return [
    canto(-1, -1, altura),
    canto(1, -1, altura),
    canto(1, -1, 0),
    canto(1, 1, 0),
    canto(-1, 1, 0),
    canto(-1, 1, altura),
  ];
}

// Posições em grade 3 × 3, de trás para a frente, para o desenho se sobrepor corretamente.
export function posicoesDeItens(centro, quantidade, z = 0) {
  const posicoes = [];
  for (let linha = -1; linha <= 1; linha += 1) {
    for (let coluna = -1; coluna <= 1; coluna += 1) {
      posicoes.push({
        x: centro.x + coluna * ESPACO_ENTRE_ITENS,
        y: centro.y + linha * ESPACO_ENTRE_ITENS,
        z,
      });
    }
  }
  return posicoes.sort((a, b) => a.x + a.y - (b.x + b.y)).slice(0, quantidade);
}

// Até seis lugares em duas fileiras, na frente da estação.
export function posicoesDaEquipe(centro, quantidade) {
  const posicoes = [];
  for (const fileira of [0, 1]) {
    for (const lugar of [-1, 0, 1]) {
      const adiante = DISTANCIA_DA_EQUIPE + fileira * ESPACO_ENTRE_PESSOAS;
      const lado = lugar * ESPACO_ENTRE_PESSOAS;
      posicoes.push({ x: centro.x + adiante + lado, y: centro.y + adiante - lado });
    }
  }
  return posicoes.slice(0, quantidade);
}

function fonteDosRotulos(escala) {
  return Math.min(13, Math.max(10, Math.round(escala * 0.38)));
}

// Estimativa da largura do texto, para posicionar sem depender de um navegador.
function larguraDoTexto(texto, fonte) {
  return texto.length * fonte * 0.56;
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(valor, maximo));
}

export function posicionarRotulos(textos, transformacao, largura, altura) {
  const fonte = fonteDosRotulos(transformacao.escala);
  const alturaDaLinha = fonte + 3;

  return textos.map(({ ancora, linhas }) => {
    const estacao = ESTACOES_NA_CENA[ancora];
    const { x, y } = estacao.centro;
    const meio = estacao.meioLado;
    const larguraDoRotulo =
      Math.max(...linhas.map((linha) => larguraDoTexto(linha, fonte))) + 4;
    const alturaDoRotulo = linhas.length * alturaDaLinha;
    const centroNaTela = transformacao.paraTela({ x, y });

    const topoIdeal =
      estacao.rotulo === "acima"
        ? transformacao.paraTela({ x: x - meio, y: y - meio, z: estacao.altura }).py -
          3 -
          alturaDoRotulo
        : transformacao.paraTela({ x: x + meio, y: y + meio }).py + 3;

    return {
      ancora,
      linhas,
      fonte,
      alturaDaLinha,
      largura: larguraDoRotulo,
      altura: alturaDoRotulo,
      esquerda: limitar(centroNaTela.px - larguraDoRotulo / 2, 0, largura - larguraDoRotulo),
      topo: limitar(topoIdeal, 0, altura - alturaDoRotulo),
    };
  });
}
