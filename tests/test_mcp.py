import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("mcp")
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from src.simulador.api import app
from src.simulador.parametros import campos_para_interface

RAIZ = Path(__file__).resolve().parents[1]
PADRAO = {campo["nome"]: campo["padrao"] for campo in campos_para_interface()}


def test_ferramentas_mcp_via_stdio_reproduzem_a_api_e_validam_entradas():
    promocao = {"base": PADRAO, "promocional": {**PADRAO, "desconto": 5, "pedidos": 30}}
    alternativas = {
        **promocao,
        "desconto_menor_centavos": 300,
        "estacao": "pessoas_preparo",
        "custo_adicional_centavos": 2010,
    }
    casos = (
        ("simular_promocao", "/api/promocoes", promocao),
        ("comparar_alternativas", "/api/promocoes/alternativas", alternativas),
    )
    cliente = TestClient(app)

    async def conferir():
        processo = StdioServerParameters(
            command=sys.executable, args=["-m", "src.simulador.mcp_servidor"], cwd=RAIZ,
        )
        async with stdio_client(processo) as (leitura, escrita):
            async with ClientSession(leitura, escrita) as sessao:
                await sessao.initialize()
                inventario = (await sessao.list_tools()).tools
                assert {item.name for item in inventario} == {caso[0] for caso in casos}
                assert all(item.annotations.readOnlyHint and item.outputSchema for item in inventario)
                for item in inventario:
                    campos = item.inputSchema["$defs"]["ParametrosSimulacao"]["properties"]
                    assert campos["preco_venda"]["type"] == "number"
                for nome, rota, dados in casos:
                    esperado = cliente.post(rota, json=dados)
                    assert esperado.status_code == 200
                    resposta = await sessao.call_tool(nome, {"hipotese": dados})
                    assert not resposta.isError
                    assert resposta.structuredContent == esperado.json()
                for ferramenta, dados in (
                    ("simular_promocao", {**promocao, "promocional": {**PADRAO, "desconto": 100}}),
                    ("comparar_alternativas", {**alternativas, "custo_adicional_centavos": -1}),
                    ("simular_promocao", {**promocao, "campo_desconhecido": True}),
                    ("simular_promocao", {**promocao, "base": {**PADRAO, "preco_venda": "35"}}),
                ):
                    resposta = await sessao.call_tool(ferramenta, {"hipotese": dados})
                    assert resposta.isError

    asyncio.run(asyncio.wait_for(conferir(), timeout=30))
