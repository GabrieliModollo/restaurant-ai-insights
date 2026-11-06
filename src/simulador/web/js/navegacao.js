// Troca as áreas sem desmontar formulário, comparação ou animação.
export function criarNavegacao() {
  const paginas = [...document.querySelectorAll('[data-pagina]')];
  const links = [...document.querySelectorAll('.menu-principal a')];
  const celular = window.matchMedia('(max-width: 700px)');
  const guia = document.querySelector('.guia-recolhivel');
  function ajustarGuia() { guia.open = !celular.matches; }
  ajustarGuia();
  celular.addEventListener('change', ajustarGuia);
  function mostrarAncora(focar = true) {
    const id = location.hash.slice(1) || 'inicio';
    const destino = document.getElementById(id);
    const pagina = destino?.closest('[data-pagina]') || paginas[0];
    for (const item of paginas) item.hidden = item !== pagina;
    for (let pai = destino?.parentElement; pai; pai = pai.parentElement) {
      if (pai.tagName === 'DETAILS') pai.open = true;
    }
    for (const link of links) {
      const alvo = document.getElementById(link.hash.slice(1));
      if (alvo?.closest('[data-pagina]') === pagina) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.title = `${links.find(link => link.hasAttribute('aria-current'))?.textContent.trim() || 'Visão geral'} · Restaurant AI Insights`;
    if (focar && destino && !document.getElementById('resultados').hidden) {
      destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });
      destino.scrollIntoView({ block: 'start' });
    }
    document.dispatchEvent(new CustomEvent('rai:navegacao', { detail: pagina.dataset.pagina }));
  }
  for (const link of document.querySelectorAll('a[href^="#"]')) {
    link.addEventListener('click', evento => {
      evento.preventDefault();
      if (location.hash === link.hash) mostrarAncora();
      else location.hash = link.hash;
    });
  }
  window.addEventListener('hashchange', () => mostrarAncora());
  mostrarAncora(false);
  const resultados = document.getElementById('resultados');
  const observador = new MutationObserver(() => {
    if (!resultados.hidden) {
      observador.disconnect();
      mostrarAncora(Boolean(location.hash));
    }
  });
  observador.observe(resultados, { attributes: true, attributeFilter: ['hidden'] });
}
