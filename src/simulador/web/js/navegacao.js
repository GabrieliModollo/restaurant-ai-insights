// No celular, alterna entre "Ajustar cenário" e "Ver resultados" sem perder os valores.
// Só age por pedido explícito: alterar um campo nunca move o foco nem rola a página.

export function criarNavegacao() {
  const principais = [...document.querySelectorAll(".navegacao-movel [data-ir-para]")];
  const todos = [...document.querySelectorAll("[data-ir-para]")];

  function mostrar(vista) {
    document.body.dataset.vista = vista;
    for (const botao of principais) {
      botao.setAttribute("aria-pressed", String(botao.dataset.irPara === vista));
    }
  }

  for (const botao of todos) {
    botao.addEventListener("click", () => {
      mostrar(botao.dataset.irPara);
      // Os botões do fim de cada parte somem junto com ela, então o foco sobe para o topo.
      if (!botao.closest(".navegacao-movel")) {
        const destino = principais.find((item) => item.dataset.irPara === botao.dataset.irPara);
        destino.focus();
        destino.closest(".navegacao-movel").scrollIntoView();
      }
    });
  }

  mostrar(document.body.dataset.vista);

  // Revela a parte antes de o navegador seguir a âncora, inclusive no celular.
  function seguirAncora() {
    const destino = document.getElementById(location.hash.slice(1));
    if (!destino) return;
    if (destino.closest(".painel")) mostrar("ajustar");
    if (destino.closest(".coluna-resultados")) mostrar("resultados");
    destino.setAttribute("tabindex", "-1");
    destino.focus({ preventScroll: true });
    destino.scrollIntoView();
  }

  for (const link of document.querySelectorAll('a[href^="#"]')) {
    link.addEventListener("click", () => {
      const destino = document.getElementById(link.hash.slice(1));
      if (destino?.closest(".painel")) mostrar("ajustar");
      if (destino?.closest(".coluna-resultados")) mostrar("resultados");
      // Também funciona quando a âncora já é a atual.
      requestAnimationFrame(seguirAncora);
    });
  }
  window.addEventListener("hashchange", seguirAncora);
  seguirAncora();

  // Um link direto para resultados aguarda a primeira resposta do servidor.
  const resultados = document.getElementById("resultados");
  if (location.hash && resultados.hidden) {
    const observador = new MutationObserver(() => {
      if (!resultados.hidden) {
        observador.disconnect();
        seguirAncora();
      }
    });
    observador.observe(resultados, { attributes: true, attributeFilter: ["hidden"] });
  }
}
