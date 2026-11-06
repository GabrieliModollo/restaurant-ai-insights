// Mostra a comparação na página. Não toca na reprodução nem nos indicadores.

import { compararCenarios, criarControleCenarioA } from "./comparacao.js";

const DICA_INICIAL = "Guarde este resultado como cenário A, mude os valores e compare.";
const DICA_AGUARDE = "Para guardar, aguarde o cálculo terminar ou corrija os campos destacados.";

function criar(tag, propriedades = {}, ...filhos) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function celula(texto, rotulo) {
  const td = criar("td", { textContent: texto });
  td.dataset.rotulo = rotulo;
  return td;
}

function criarTabela(comparacao) {
  const corpo = comparacao.indicadores.map((item) =>
    criar(
      "tr",
      {},
      criar("th", { scope: "row", textContent: item.rotulo }),
      celula(item.a, "Cenário A"),
      celula(item.atual, "Atual"),
      celula(item.diferenca, "Diferença"),
    ),
  );

  return criar(
    "table",
    { className: "tabela-comparacao" },
    criar("caption", { textContent: "Resultados do turno completo de cada cenário" }),
    criar(
      "thead",
      {},
      criar(
        "tr",
        {},
        ...["Indicador", "Cenário A", "Atual", "Diferença (Atual − A)"].map((titulo) =>
          criar("th", { scope: "col", textContent: titulo }),
        ),
      ),
    ),
    criar("tbody", {}, ...corpo),
  );
}

function criarListaDeParametros(alterados) {
  if (alterados.length === 0) {
    return criar("p", { className: "cena-dica", textContent: "Nenhum parâmetro mudou." });
  }
  return criar(
    "div",
    {},
    criar("h3", { textContent: "Parâmetros alterados" }),
    criar(
      "ul",
      { className: "lista-alterados" },
      ...alterados.map(({ rotulo, a, atual }) =>
        criar("li", { textContent: `${rotulo}: de ${a} para ${atual}` }),
      ),
    ),
  );
}

export function criarComparacao() {
  const botaoSalvar = document.getElementById("a-salvar");
  const botaoLimpar = document.getElementById("a-limpar");
  const dica = document.getElementById("a-dica");
  const anuncio = document.getElementById("a-anuncio");
  const conteudo = document.getElementById("a-conteudo");
  const controle = criarControleCenarioA();
  let campos = [];

  function mostrar() {
    const temA = controle.a !== null;
    botaoSalvar.disabled = !controle.podeSalvar;
    botaoSalvar.textContent = temA ? "Substituir cenário A" : "Guardar como cenário A";
    botaoLimpar.hidden = !temA;

    if (!controle.podeSalvar) {
      dica.textContent = DICA_AGUARDE;
    } else {
      dica.textContent = temA ? "Mude os valores para comparar com o cenário A." : DICA_INICIAL;
    }

    if (!temA || !controle.ultimo) {
      conteudo.replaceChildren(criar("div", { className: "comparacao-vazia" },
        criar("h3", { textContent: "Sua próxima comparação começa aqui" }),
        criar("p", { textContent: "Guarde o cenário atual como A. Depois, abra o simulador, ajuste os valores e volte para conferir as diferenças." }),
      ));
      return;
    }

    const comparacao = compararCenarios(controle.a, controle.ultimo, campos);
    const partes = [
      criar("p", {
        className: "comparacao-periodos",
        textContent: `Cenário A: ${comparacao.periodoA}. Atual: ${comparacao.periodoAtual}.`,
      }),
    ];
    if (comparacao.duracoesDiferentes) {
      partes.push(
        criar("p", {
          className: "comparacao-alerta",
          textContent:
            "Atenção: os turnos têm durações diferentes, então os totais cobrem períodos diferentes.",
        }),
      );
    }
    if (!controle.atualizado) {
      partes.push(
        criar("p", {
          className: "comparacao-alerta",
          textContent: "A coluna Atual mostra o último cenário válido, não os parâmetros digitados.",
        }),
      );
    }
    partes.push(criarListaDeParametros(comparacao.parametrosAlterados), criarTabela(comparacao));
    conteudo.replaceChildren(...partes);
  }

  botaoSalvar.addEventListener("click", () => {
    const substituindo = controle.a !== null;
    if (controle.salvar()) {
      anuncio.textContent = substituindo ? "Cenário A substituído." : "Cenário A guardado.";
      mostrar();
    }
  });
  botaoLimpar.addEventListener("click", () => {
    controle.limpar();
    anuncio.textContent = "Cenário A removido.";
    mostrar();
    botaoSalvar.focus(); // o botão de limpar sumiu, e o foco não pode se perder
  });

  mostrar();

  return {
    definirCampos(novosCampos) {
      campos = novosCampos;
    },
    registrar(parametros, resultado) {
      controle.registrar(parametros, resultado);
      mostrar();
    },
    definirSituacao(situacao) {
      controle.definirSituacao(situacao);
      mostrar();
    },
  };
}
