"""Configuração da demo no Render: plano gratuito, mesmo app e mesma versão de Python do CI."""

import re
from pathlib import Path

from fastapi.testclient import TestClient

from src.simulador.api import app

RAIZ = Path(__file__).resolve().parents[1]
RENDER = (RAIZ / "render.yaml").read_text(encoding="utf-8")


def _valor(chave: str) -> str:
    return re.search(rf"^\s*-?\s*{chave}:\s*(.+)$", RENDER, re.MULTILINE).group(1).strip()


def test_demo_usa_plano_gratuito_e_publica_a_main():
    assert _valor("plan") == "free"
    assert _valor("branch") == "main"
    assert _valor("runtime") == "python"


def test_comando_de_inicio_aponta_para_o_app_e_a_porta_do_render():
    comando = _valor("startCommand")
    assert "src.simulador.api:app" in comando
    assert "--host 0.0.0.0" in comando and "--port $PORT" in comando


def test_verificacao_de_saude_usa_rota_existente():
    assert TestClient(app).get(_valor("healthCheckPath")).status_code == 200


def test_python_igual_ao_do_ci():
    versao = re.search(r"key: PYTHON_VERSION\s+value: ([\d.]+)", RENDER).group(1)
    ci = (RAIZ / ".github" / "workflows" / "testes.yml").read_text(encoding="utf-8")
    assert re.fullmatch(r"\d+\.\d+\.\d+", versao)
    assert f'python-version: "{versao.rsplit(".", 1)[0]}"' in ci


def test_demo_nao_liga_a_ia_local():
    assert "RAI_IA_LOCAL" not in RENDER
