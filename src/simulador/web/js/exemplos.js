// Oferece os exemplos fictícios. Aplicar um deles só preenche o formulário:
// validação, cálculo e reprodução seguem o fluxo normal.

export function criarExemplos(exemplos, formulario) {
  const lista = document.getElementById("lista-exemplos");
  const aviso = document.getElementById("exemplo-aplicado");

  lista.replaceChildren(
    ...exemplos.map((exemplo) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "botao";
      botao.textContent = exemplo.titulo;
      botao.addEventListener("click", () => {
        formulario.aplicarValores(exemplo.parametros);
        aviso.textContent = `${exemplo.titulo} aplicado.`;
      });

      const descricao = document.createElement("p");
      descricao.className = "dica";
      descricao.textContent = exemplo.o_que_explorar;

      const item = document.createElement("div");
      item.className = "exemplo";
      item.append(botao, descricao);
      return item;
    }),
  );
}
