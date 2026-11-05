// Reconstrói o estado do restaurante em cada instante, apenas aplicando os eventos do servidor
// na ordem recebida. Nenhuma regra da simulação é repetida aqui.

function estadoInicial() {
  return {
    chegados: 0,
    fila: { preparo: 0, embalagem: 0 },
    atendendo: { preparo: 0, embalagem: 0 },
    finalizados: { preparo: 0, embalagem: 0 },
  };
}

function copiar(estado) {
  return {
    chegados: estado.chegados,
    fila: { ...estado.fila },
    atendendo: { ...estado.atendendo },
    finalizados: { ...estado.finalizados },
  };
}

function aplicar(estado, { tipo, estacao }) {
  if (tipo === "chegada") {
    estado.chegados += 1;
    estado.fila.preparo += 1;
  } else if (tipo.startsWith("inicio_")) {
    estado.fila[estacao] -= 1;
    estado.atendendo[estacao] += 1;
  } else {
    estado.atendendo[estacao] -= 1;
    estado.finalizados[estacao] += 1;
    if (estacao === "preparo") {
      estado.fila.embalagem += 1;
    }
  }
}

export function criarLinhaDoTempo(eventos, duracao) {
  // Guarda o estado ao fim de cada instante. Eventos simultâneos são aplicados juntos, então
  // uma chegada seguida de início imediato nunca aparece como fila.
  const instantes = [];
  const estados = [];
  const atual = estadoInicial();

  eventos.forEach((evento, indice) => {
    aplicar(atual, evento);
    if (eventos[indice + 1]?.minuto !== evento.minuto) {
      instantes.push(evento.minuto);
      estados.push(copiar(atual));
    }
  });

  const vazio = estadoInicial();

  // Índice do último instante até o minuto pedido, ou -1 se ainda não houve nenhum.
  function ultimoIndiceAte(minuto) {
    let inicio = 0;
    let fim = instantes.length - 1;
    let achado = -1;
    while (inicio <= fim) {
      const meio = Math.floor((inicio + fim) / 2);
      if (instantes[meio] <= minuto) {
        achado = meio;
        inicio = meio + 1;
      } else {
        fim = meio - 1;
      }
    }
    return achado;
  }

  return {
    instantes,
    estadoEm(minuto) {
      const indice = ultimoIndiceAte(minuto);
      return indice < 0 ? vazio : estados[indice];
    },
    proximoInstante(minuto) {
      return instantes[ultimoIndiceAte(minuto) + 1] ?? duracao;
    },
    instanteAnterior(minuto) {
      const indice = ultimoIndiceAte(minuto);
      if (indice < 0) {
        return 0;
      }
      return instantes[indice] < minuto ? instantes[indice] : (instantes[indice - 1] ?? 0);
    },
  };
}
