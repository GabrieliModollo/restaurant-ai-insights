// Descobre qual estação está sob um ponto da tela. Só preparo e embalagem são selecionáveis.

import { ESTACOES_NA_CENA, silhueta } from "./geometria.js";

const SELECIONAVEIS = ["preparo", "embalagem"];

// Em quadros pequenos, o bloco fica menor do que um dedo. Este alcance mantém o clique possível.
const ALCANCE_MINIMO_PX = 22;

export function pontoNoPoligono({ px, py }, vertices) {
  let dentro = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const a = vertices[i];
    const b = vertices[j];
    const cruza = a.py > py !== b.py > py;
    if (cruza && px < ((b.px - a.px) * (py - a.py)) / (b.py - a.py) + a.px) {
      dentro = !dentro;
    }
  }
  return dentro;
}

export function estacaoEm(ponto, transformacao) {
  for (const nome of SELECIONAVEIS) {
    if (pontoNoPoligono(ponto, silhueta(ESTACOES_NA_CENA[nome], transformacao))) {
      return nome;
    }
  }

  for (const nome of SELECIONAVEIS) {
    const centro = transformacao.paraTela(ESTACOES_NA_CENA[nome].centro);
    if (Math.hypot(ponto.px - centro.px, ponto.py - centro.py) <= ALCANCE_MINIMO_PX) {
      return nome;
    }
  }
  return null;
}
