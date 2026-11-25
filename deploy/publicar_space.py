"""Publica a demo no Hugging Face Spaces com apenas os arquivos de que o contêiner precisa.

Executado pelo workflow `demo.yml`, com o token em HF_TOKEN e o Space em HF_SPACE
(por exemplo, "usuario/restaurant-ai-insights"). O README do Space, que exige cabeçalho
próprio, vem de deploy/space-readme.md; o README do GitHub não é alterado.
"""

import os
import shutil
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ARQUIVOS = ("Dockerfile", ".dockerignore", "requirements.txt")


def montar_pasta(destino: Path) -> Path:
    for nome in ARQUIVOS:
        shutil.copy2(RAIZ / nome, destino / nome)
    shutil.copy2(RAIZ / "deploy" / "space-readme.md", destino / "README.md")
    shutil.copytree(RAIZ / "src", destino / "src", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    return destino


def publicar() -> None:
    from huggingface_hub import HfApi  # instalado só no workflow de publicação

    espaco = os.environ["HF_SPACE"]
    api = HfApi(token=os.environ["HF_TOKEN"])
    api.create_repo(espaco, repo_type="space", space_sdk="docker", private=False, exist_ok=True)
    versao = os.environ.get("GITHUB_SHA", "local")[:7]
    with tempfile.TemporaryDirectory() as temporaria:
        pasta = montar_pasta(Path(temporaria))
        api.upload_folder(
            repo_id=espaco,
            repo_type="space",
            folder_path=pasta,
            commit_message=f"Publica a versão {versao} do GitHub",
            delete_patterns=["src/**"],  # remove do Space arquivos apagados no GitHub
        )
    print(f"Publicado em https://huggingface.co/spaces/{espaco}")


if __name__ == "__main__":
    publicar()
