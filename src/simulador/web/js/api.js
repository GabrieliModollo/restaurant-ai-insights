// Comunicação HTTP com o servidor. Nenhuma regra de negócio mora aqui.

const TEMPO_LIMITE_MS = 10000;

export class ErroDeValidacao extends Error {
  constructor(erros) {
    super("O servidor rejeitou os parâmetros.");
    this.erros = erros;
  }
}

export class ErroDoServidor extends Error {
  constructor(status) {
    super(`O servidor respondeu com o código ${status}.`);
    this.status = status;
  }
}

export class ErroDeConexao extends Error {}

function foiInterrompido(erro) {
  return erro.name === "AbortError" || erro.name === "TimeoutError";
}

async function pedir(url, opcoes, signal) {
  const sinais = [AbortSignal.timeout(TEMPO_LIMITE_MS)];
  if (signal) {
    sinais.push(signal);
  }
  try {
    return await fetch(url, { ...opcoes, signal: AbortSignal.any(sinais) });
  } catch (erro) {
    throw foiInterrompido(erro) ? erro : new ErroDeConexao(erro.message);
  }
}

async function lerJson(resposta) {
  try {
    return await resposta.json();
  } catch (erro) {
    throw foiInterrompido(erro) ? erro : new ErroDoServidor(resposta.status);
  }
}

export async function buscarCampos() {
  const resposta = await pedir("/api/campos");
  if (!resposta.ok) {
    throw new ErroDoServidor(resposta.status);
  }
  return lerJson(resposta);
}

export async function buscarExemplos() {
  const resposta = await pedir("/api/exemplos");
  if (!resposta.ok) {
    throw new ErroDoServidor(resposta.status);
  }
  return lerJson(resposta);
}

export async function simular(valores, signal) {
  const resposta = await pedir(
    "/api/simulacoes",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    },
    signal,
  );

  if (resposta.status === 422) {
    const corpo = await lerJson(resposta);
    if (!corpo?.erros) {
      throw new ErroDoServidor(resposta.status);
    }
    throw new ErroDeValidacao(corpo.erros);
  }
  if (!resposta.ok) {
    throw new ErroDoServidor(resposta.status);
  }
  return lerJson(resposta);
}

export function descreverErro(erro) {
  if (erro.name === "TimeoutError") {
    return `O servidor demorou mais de ${TEMPO_LIMITE_MS / 1000} segundos para responder.`;
  }
  if (erro instanceof ErroDoServidor) {
    return `O servidor encontrou um erro (código ${erro.status}).`;
  }
  return "Não foi possível conectar ao servidor. Confira se ele está em execução.";
}
