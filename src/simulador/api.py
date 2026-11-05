"""Servidor: rotas da API e arquivos da interface, na mesma origem.

Execute a partir da raiz do projeto:
    python -m uvicorn src.simulador.api:app --reload --port 8010
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

from .parametros import ParametrosSimulacao, campos_para_interface
from .simulacao import executar_simulacao

PASTA_WEB = Path(__file__).parent / "web"
MENSAGEM_CORPO_INVALIDO = "Envie um objeto JSON válido."

# Sem /docs nem /redoc: essas páginas carregam arquivos de um CDN externo.
# Sem elas, /openapi.json fica sem uso; ele não depende de CDN e pode voltar quando for útil.
app = FastAPI(
    title="Restaurant AI Insights: simulador",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.exception_handler(RequestValidationError)
async def _erros_em_portugues(_: Request, erro: RequestValidationError) -> JSONResponse:
    """Devolve {"erros": {campo: mensagem}}, fácil de mostrar ao lado de cada controle."""
    mensagens_padrao = {
        "missing": "Campo obrigatório.",
        "extra_forbidden": "Campo não reconhecido.",
    }
    erros = {}
    for item in erro.errors():
        local = item["loc"]
        if len(local) != 2 or not isinstance(local[1], str):
            erros["corpo"] = MENSAGEM_CORPO_INVALIDO
        else:
            erros[local[1]] = mensagens_padrao.get(item["type"], item["msg"])
    return JSONResponse(status_code=422, content={"erros": erros})


@app.exception_handler(HTTPException)
async def _corpo_ilegivel(requisicao: Request, erro: HTTPException) -> Response:
    """O FastAPI usa 400 quando nem consegue ler o corpo; o contrato é o mesmo dos outros erros."""
    if erro.status_code == 400:
        return JSONResponse(status_code=422, content={"erros": {"corpo": MENSAGEM_CORPO_INVALIDO}})
    return await http_exception_handler(requisicao, erro)


@app.get("/api/campos")
def listar_campos() -> list[dict]:
    return campos_para_interface()


@app.post("/api/simulacoes")
def simular(parametros: ParametrosSimulacao) -> dict:
    return executar_simulacao(parametros)


# Montado por último: as rotas /api acima têm prioridade sobre os arquivos.
app.mount("/", StaticFiles(directory=PASTA_WEB, html=True), name="web")
