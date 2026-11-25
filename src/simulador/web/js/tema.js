// Tema claro (padrão) ou noturno, escolhido pela pessoa e lembrado neste navegador.
// O <head> aplica o tema salvo antes de desenhar a página, para não piscar no claro.

export const CHAVE = "rai-tema";

export function normalizarTema(valor) {
  return valor === "noturno" ? "noturno" : "claro";
}

export function lerTema(armazenamento) {
  try {
    return normalizarTema(armazenamento?.getItem(CHAVE));
  } catch {
    return "claro";
  }
}

export function salvarTema(armazenamento, tema) {
  try {
    armazenamento?.setItem(CHAVE, tema);
  } catch {
    // Sem armazenamento (modo privado, bloqueio): o tema vale só até recarregar.
  }
}

export function aplicarTema(raiz, tema) {
  if (tema === "noturno") raiz.dataset.tema = "noturno";
  else delete raiz.dataset.tema;
}

export function iniciarTema() {
  const raiz = document.documentElement;
  const botoes = [...document.querySelectorAll("#seletor-tema [data-tema-opcao]")];
  let armazenamento = null;
  try {
    armazenamento = window.localStorage;
  } catch {
    armazenamento = null;
  }

  function mostrar(tema) {
    aplicarTema(raiz, tema);
    for (const botao of botoes) {
      botao.setAttribute("aria-pressed", String(botao.dataset.temaOpcao === tema));
    }
  }

  mostrar(lerTema(armazenamento));
  for (const botao of botoes) {
    botao.addEventListener("click", () => {
      const tema = normalizarTema(botao.dataset.temaOpcao);
      salvarTema(armazenamento, tema);
      mostrar(tema);
      document.dispatchEvent(new CustomEvent("tema-alterado", { detail: tema }));
    });
  }
}
