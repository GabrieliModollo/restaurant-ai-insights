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
}
