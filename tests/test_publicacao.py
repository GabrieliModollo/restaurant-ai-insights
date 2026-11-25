"""Pacote da demo: só os arquivos do contêiner, com o README próprio do Space."""

import re

from deploy.publicar_space import RAIZ, montar_pasta


def test_pasta_da_demo_tem_so_o_necessario(tmp_path):
    pasta = montar_pasta(tmp_path)
    nomes = {item.name for item in pasta.iterdir()}
    assert nomes == {"Dockerfile", ".dockerignore", "requirements.txt", "README.md", "src"}
    assert (pasta / "src" / "simulador" / "api.py").is_file()
    assert (pasta / "src" / "simulador" / "web" / "index.html").is_file()
    assert not list(pasta.rglob("__pycache__"))


def test_readme_do_space_declara_docker_na_porta_do_conteiner(tmp_path):
    cabecalho = (montar_pasta(tmp_path) / "README.md").read_text(encoding="utf-8").split("---")[1]
    porta = re.search(r'"--port", "(\d+)"', (RAIZ / "Dockerfile").read_text(encoding="utf-8")).group(1)
    assert "sdk: docker" in cabecalho
    assert f"app_port: {porta}" in cabecalho


def test_conteiner_nao_liga_a_ia_local():
    assert "RAI_IA_LOCAL" not in (RAIZ / "Dockerfile").read_text(encoding="utf-8")
