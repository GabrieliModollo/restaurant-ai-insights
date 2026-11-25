"""Agente local com MCP: esquema simplificado para o modelo e proteção contra números inventados.

O modelo é simulado; o servidor MCP e o motor são os reais.
"""

import asyncio

import pytest

pytest.importorskip("mcp")
from scripts import agente_mcp  # noqa: E402


def test_esquema_para_ollama_remove_o_que_confunde_o_modelo():
    esquema = {
        "type": "object", "title": "x", "required": ["desconto_reais"],
        "properties": {
            "desconto_reais": {"type": "number", "exclusiveMinimum": 0, "title": "D", "description": "Desconto."},
            "pedidos": {"anyOf": [{"type": "integer", "minimum": 0}, {"type": "null"}], "default": None, "description": "Pedidos."},
        },
    }
    assert agente_mcp.esquema_para_ollama(esquema) == {
        "type": "object", "required": ["desconto_reais"],
        "properties": {
            "desconto_reais": {"type": "number", "description": "Desconto."},
            "pedidos": {"type": "integer", "description": "Pedidos."},
        },
    }


def _modelo(monkeypatch, respostas):
    fila = list(respostas)
    monkeypatch.setattr(agente_mcp, "chat", lambda *_: fila.pop(0))


def _chamada(argumentos):
    return {"role": "assistant", "content": "", "tool_calls": [
        {"function": {"name": "testar_desconto", "arguments": argumentos}},
    ]}


def _executar(pergunta="Um desconto de R$ 5 se paga?"):
    return asyncio.run(agente_mcp.executar(pergunta, "simulado", {"testar_desconto"}))


def test_resposta_com_numeros_do_motor_e_aceita(monkeypatch):
    _modelo(monkeypatch, [_chamada({"desconto_reais": 5}), {"content": "Não se paga: precisa de 25 prontos e a equipe faz 22."}])
    transcricao = _executar()
    resultado = next(p for p in transcricao["passos"] if p["tipo"] == "resultado")["dados"]
    assert (resultado["pedidos_prontos_necessarios"], resultado["capacidade_do_turno"]) == (25, 22)
    assert transcricao["conclusao"] == {"origem": "modelo", "texto": "Não se paga: precisa de 25 prontos e a equipe faz 22."}


def test_numero_inventado_depois_da_ferramenta_vira_texto_por_regras(monkeypatch):
    _modelo(monkeypatch, [_chamada({"desconto_reais": 5}), {"content": "Se paga com 40 pedidos."}])
    conclusao = _executar()["conclusao"]
    assert conclusao["origem"] == "regras"
    assert conclusao["numeros_recusados"] == ["40"]
    assert "25 pedidos prontos" in conclusao["texto"] and "−R$ 76,50" in conclusao["texto"]


def test_resposta_sem_consultar_o_simulador_e_descartada(monkeypatch):
    _modelo(monkeypatch, [{"content": "15 40 -15"}])
    conclusao = _executar()["conclusao"]
    assert conclusao["origem"] == "recusada"
    assert conclusao["numeros_recusados"] == ["15", "40"]


def test_erro_da_ferramenta_volta_ao_modelo(monkeypatch):
    _modelo(monkeypatch, [_chamada({}), _chamada({"desconto_reais": 2, "pedidos": 30}), {"content": "Se paga."}])
    transcricao = _executar("Desconto de 2 reais com 30 pedidos?")
    assert [p["tipo"] for p in transcricao["passos"]] == ["ferramentas", "chamada", "erro_ferramenta", "chamada", "resultado", "resposta_modelo"]
    assert transcricao["conclusao"]["origem"] == "modelo"
