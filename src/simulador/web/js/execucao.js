// Garante que só a resposta do pedido mais recente chegue à tela.

export function criarExecutor({ buscar, aoResultado, aoErro }) {
  let atual = null;

  function cancelar() {
    atual?.abort();
    atual = null;
  }

  async function executar(valores) {
    cancelar();
    const controle = new AbortController();
    atual = controle;

    // O cancelamento pode chegar tarde demais, com a resposta já a caminho. Por isso, além de
    // cancelar, cada resposta confere se ainda pertence ao pedido mais recente.
    try {
      const resultado = await buscar(valores, controle.signal);
      if (atual === controle) {
        aoResultado(resultado);
      }
    } catch (erro) {
      if (atual === controle) {
        aoErro(erro);
      }
    }
  }

  return { executar, cancelar };
}
