// Relógio da reprodução. Só agenda quadros enquanto toca; ao pausar ou terminar, o ciclo para.
// O agendador é recebido de fora, o que permite testar sem navegador.

export const SEGUNDOS_DO_TURNO = 30; // duração do turno inteiro na velocidade 1x

// Evita saltos depois de uma pausa longa, sem atrasar o relógio em computadores lentos,
// nos quais os quadros podem chegar a cada meio segundo ou mais.
const MAIOR_INTERVALO_MS = 1000;
const TOLERANCIA = 1e-9;

export function criarReproducao({ agendar, cancelar, aoAtualizar }) {
  let duracao = 0;
  let minuto = 0;
  let tocando = false;
  let velocidade = 1;
  let quadroAgendado = null;
  let ultimoInstante = null;

  function pararCiclo() {
    if (quadroAgendado !== null) {
      cancelar(quadroAgendado);
      quadroAgendado = null;
    }
    ultimoInstante = null;
  }

  function aoQuadro(agora) {
    quadroAgendado = null;
    if (!tocando) {
      return;
    }
    const decorrido =
      ultimoInstante === null ? 0 : Math.min(agora - ultimoInstante, MAIOR_INTERVALO_MS);
    ultimoInstante = agora;
    minuto += (decorrido / 1000) * (duracao / SEGUNDOS_DO_TURNO) * velocidade;

    if (minuto >= duracao - TOLERANCIA) {
      minuto = duracao;
      tocando = false;
      ultimoInstante = null;
    } else {
      quadroAgendado = agendar(aoQuadro);
    }
    aoAtualizar();
  }

  const controle = {
    get minuto() {
      return minuto;
    },
    get duracao() {
      return duracao;
    },
    get tocando() {
      return tocando;
    },
    get velocidade() {
      return velocidade;
    },
    carregar(novaDuracao) {
      pararCiclo();
      tocando = false;
      duracao = novaDuracao;
      minuto = 0;
      aoAtualizar();
    },
    iniciar() {
      if (tocando) {
        return;
      }
      if (minuto >= duracao) {
        minuto = 0;
      }
      tocando = true;
      ultimoInstante = null;
      quadroAgendado = agendar(aoQuadro);
      aoAtualizar();
    },
    pausar() {
      if (!tocando) {
        return;
      }
      tocando = false;
      pararCiclo();
      aoAtualizar();
    },
    alternar() {
      if (tocando) {
        controle.pausar();
      } else {
        controle.iniciar();
      }
    },
    reiniciar() {
      tocando = false;
      pararCiclo();
      minuto = 0;
      aoAtualizar();
    },
    irPara(novoMinuto) {
      tocando = false;
      pararCiclo();
      minuto = Math.max(0, Math.min(novoMinuto, duracao));
      aoAtualizar();
    },
    definirVelocidade(novaVelocidade) {
      velocidade = novaVelocidade;
    },
  };

  return controle;
}
