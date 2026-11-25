# Demo online

A demo pública roda no **Render**, no plano gratuito, e usa o modo por regras: sem Ollama, chaves de
API ou serviços pagos. Todas as áreas e o assistente de decisões funcionam. A explicação e a
interpretação com IA local ficam desativadas, e a interface informa isso.

Endereço: <https://restaurant-ai-insights.onrender.com>. Publicação autorizada pela pessoa responsável
em 24/11/2026.

## Como funciona

- O [`render.yaml`](../render.yaml) descreve o serviço: Python 3.12.16 (a mesma série do GitHub Actions),
  `pip install -r requirements.txt` e o mesmo `uvicorn` da execução local, na porta `$PORT` do Render.
- Cada commit na `main` publica uma nova versão (`autoDeployTrigger: commit`).
- O Render confere a saúde do serviço em `GET /api/campos`.
- `tests/test_publicacao.py` confere o plano gratuito, a branch, o comando de início, a rota de saúde e
  a versão do Python.

### Limites do plano gratuito

- O serviço **hiberna após 15 minutos sem visitas**; a primeira visita depois disso leva de 30 s a 1 min.
- São 750 horas de instância por mês no workspace. Uma demo hibernada a maior parte do tempo fica
  abaixo disso.
- Arquivos gravados no disco se perdem ao reiniciar. O simulador não grava nada, então isso não o afeta.

## Configuração (uma vez, pela pessoa responsável)

1. No Render, com a conta ligada ao GitHub: **New → Blueprint**.
2. Escolher o repositório `restaurant-ai-insights`, conferir o serviço gratuito descrito no
   `render.yaml` e aplicar.
3. Esperar a primeira publicação e copiar o endereço `https://….onrender.com`.

Nenhum token ou segredo fica no repositório.

## Verificação da demo publicada

Em 24/11/2026, depois da primeira publicação, o mesmo roteiro de Chrome usado no assistente rodou
contra o endereço público: 320, 390, 768 e 1280 px, temas claro e escuro, sem estouro horizontal nem
violações do axe no painel do assistente; fluxos de promoção (25 / 22 / −R$ 76,50), regras com fontes,
fora do escopo, pergunta curta, cenário editado (30 pedidos) e falha 500 simulada aprovados.

## Hugging Face Spaces (descartado)

A primeira tentativa usou o Hugging Face Spaces com Docker. Em 24/11/2026, a criação do Space
retornou **402 Payment Required**: Spaces Docker passaram a exigir o plano PRO em contas pessoais.
Como o projeto tem custo zero, a publicação foi trocada pelo Render. Se a variável `HF_SPACE` e o
segredo `HF_TOKEN` ainda existirem no GitHub, podem ser apagados.
