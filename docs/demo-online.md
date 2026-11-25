# Demo online

A demo pública roda no **Hugging Face Spaces** (plano gratuito, SDK Docker), no modo por regras:
sem Ollama, chaves de API ou serviços pagos. O assistente de decisões e todas as áreas funcionam;
a explicação e a interpretação com IA local ficam desativadas, e a interface informa isso.

Publicação autorizada pela pessoa responsável em 24/11/2026.

## Como funciona

1. A cada merge na `main` que altere `src/`, `requirements.txt`, `Dockerfile`, `.dockerignore`,
   `deploy/` ou o próprio workflow, o [`demo.yml`](../.github/workflows/demo.yml) monta uma pasta só com
   os arquivos do contêiner (`deploy/publicar_space.py`) e a envia ao Space.
2. O README do Space vem de [`deploy/space-readme.md`](../deploy/space-readme.md), com o cabeçalho que o
   Hugging Face exige. O README do GitHub não muda.
3. O Space monta a imagem do [`Dockerfile`](../Dockerfile) (Python 3.12, usuário UID 1000, porta 7860)
   e inicia o mesmo `uvicorn` da execução local.

Sem a variável `HF_SPACE`, o workflow não roda. O Space gratuito hiberna após cerca de 48 horas sem
visitas; a primeira visita depois disso leva um tempo para acordar.

## Configuração (uma vez, pela pessoa responsável)

1. Criar uma conta em <https://huggingface.co> e um token de acesso do tipo **Write**
   (Settings → Access Tokens).
2. No GitHub, em **Settings → Secrets and variables → Actions**:
   - em **Secrets**, criar `HF_TOKEN` com o token;
   - em **Variables**, criar `HF_SPACE` com `seu-usuario-hf/restaurant-ai-insights`.
3. Em **Actions → Publicar demo → Run workflow**, executar a primeira publicação. O script cria o
   Space público se ele ainda não existir.

O token fica só nos segredos do GitHub; ele não aparece nos arquivos nem nos registros do workflow.

## Verificação local do pacote

`tests/test_publicacao.py` confere o conteúdo da pasta enviada. Antes da primeira publicação, a pasta
foi montada e iniciada com o mesmo comando do contêiner (porta 7860): página, arquivos estáticos e
`POST /api/assistente` responderam como na execução local. A imagem Docker é montada pelo Hugging Face.
