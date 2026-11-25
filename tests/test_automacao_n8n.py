"""Fluxo do n8n versionado: estrutura válida, rotas existentes e nenhuma credencial."""

import json
import re
from pathlib import Path

from fastapi.testclient import TestClient

from src.simulador.api import app

RAIZ = Path(__file__).resolve().parents[1]
FLUXO = json.loads((RAIZ / "automacoes" / "n8n" / "resumo-diario.json").read_text(encoding="utf-8"))
NOS = {no["name"]: no for no in FLUXO["nodes"]}


def test_conexoes_ligam_nos_existentes_em_uma_unica_sequencia():
    destinos = []
    for origem, saidas in FLUXO["connections"].items():
        assert origem in NOS
        for ligacao in saidas["main"][0]:
            assert ligacao["node"] in NOS
            destinos.append(ligacao["node"])
    gatilhos = {nome for nome, no in NOS.items() if no["type"].endswith("Trigger")}
    assert gatilhos == {"Todo dia às 23h", "Executar agora"}
    assert set(NOS) - set(destinos) == gatilhos


def test_rotas_chamadas_existem_na_api():
    rotas = {rota.path for rota in app.routes if hasattr(rota, "methods")}
    chamadas = set()
    for no in NOS.values():
        url = no["parameters"].get("url", "")
        caminho = re.search(r"\}\}(/[\w/.-]+)$", url)
        if caminho:
            chamadas.add(caminho.group(1))
    assert {"/api/referencias/csv", "/api/campos", "/api/assistente"} <= chamadas
    for caminho in chamadas - {"/exemplos/referencia-sintetica.csv"}:
        assert caminho in rotas, caminho
    assert TestClient(app).get("/exemplos/referencia-sintetica.csv").status_code == 200


def test_fluxo_nao_guarda_credenciais_e_fica_inativo():
    texto = json.dumps(FLUXO).lower()
    assert "credentials" not in texto
    assert not re.search(r"token|senha|password|api[_-]?key", texto)
    assert FLUXO["active"] is False


def test_resumo_salvo_na_pasta_de_saida_do_projeto():
    config = {item["name"]: item["value"] for item in NOS["Configuração"]["parameters"]["assignments"]["assignments"]}
    assert config["pasta_saida"] == "automacoes/saida"
    assert config["api"].startswith("https://")


def test_chamadas_http_tentam_de_novo_enquanto_a_demo_acorda():
    # A demo gratuita responde 503 nos primeiros segundos depois de hibernar.
    for no in NOS.values():
        if no["type"] == "n8n-nodes-base.httpRequest":
            assert no.get("retryOnFail") is True, no["name"]
            assert no["maxTries"] * no["waitBetweenTries"] >= 20_000, no["name"]
            assert no["parameters"]["options"]["timeout"] >= 60_000, no["name"]
