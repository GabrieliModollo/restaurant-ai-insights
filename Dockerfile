# Demo pública no Hugging Face Spaces (SDK Docker). Roda o simulador no modo por regras, sem Ollama.
FROM python:3.12-slim

# O Spaces executa o contêiner com o usuário de UID 1000.
RUN useradd --create-home --uid 1000 usuario
USER usuario
ENV PATH="/home/usuario/.local/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /home/usuario/app

COPY --chown=usuario requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=usuario src ./src

EXPOSE 7860
CMD ["uvicorn", "src.simulador.api:app", "--host", "0.0.0.0", "--port", "7860"]
