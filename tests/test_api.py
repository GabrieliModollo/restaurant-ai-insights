"""Contrato HTTP. As regras de negócio são testadas no núcleo, sem servidor."""

import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import src.simulador.api as modulo_api
from src.simulador.api import app
from src.simulador.parametros import CAMPOS, ParametrosSimulacao
from src.simulador.simulacao import executar_simulacao

PASTA_WEB = Path(modulo_api.__file__).parent / "web"
CABECALHO_JSON = {"Content-Type": "application/json"}
CORPO_INVALIDO = {"erros": {"corpo": "Envie um objeto JSON válido."}}

cliente = TestClient(app)

PADRAO = {campo["nome"]: campo["padrao"] for campo in cliente.get("/api/campos").json()}


def _simular(**alteracoes):
    return cliente.post("/api/simulacoes", json={**PADRAO, **alteracoes})


def test_campos_fornecem_limites_e_valores_iniciais():
    resposta = cliente.get("/api/campos")

    assert resposta.status_code == 200
    for item, campo in zip(resposta.json(), CAMPOS, strict=True):
        assert item["nome"] == campo.nome
        assert item["unidade"] == campo.unidade
        assert item["minimo"] == float(campo.minimo)
        assert item["maximo"] == float(campo.maximo)
        assert item["padrao"] == float(campo.padrao)


def test_exemplos_ficticios_passam_pela_validacao_normal_da_api():
    resposta = cliente.get("/api/exemplos")

    assert resposta.status_code == 200
    assert len(resposta.json()) == 3
    for exemplo in resposta.json():
        assert cliente.post("/api/simulacoes", json=exemplo["parametros"]).status_code == 200


def test_resposta_inclui_o_resumo_por_regras():
    resumo = _simular().json()["resumo"]

    assert "sem IA conectada" in resumo["identificacao"]
    assert resumo["conclusao"]


def test_rota_delega_o_calculo_a_executar_simulacao(monkeypatch):
    recebidos = []

    def falso(parametros):
        recebidos.append(parametros)
        return {"financeiro": {}, "operacao": {"marcador": 1}}

    monkeypatch.setattr(modulo_api, "executar_simulacao", falso)

    resposta = _simular(pedidos=7)

    assert resposta.json() == {"financeiro": {}, "operacao": {"marcador": 1}}
    assert isinstance(recebidos[0], ParametrosSimulacao)
    assert recebidos[0].pedidos == 7


def test_resposta_valida_e_o_resultado_do_nucleo_em_json():
    esperado = executar_simulacao(ParametrosSimulacao(**PADRAO))

    resposta = _simular()

    assert resposta.status_code == 200
    assert resposta.json() == json.loads(json.dumps(esperado))


def test_media_ausente_chega_como_nulo_e_nao_como_zero():
    operacao = _simular(pedidos=0).json()["operacao"]

    assert operacao["espera_media_fila_min"] is None
    assert operacao["tempo_total_medio_min"] is None


@pytest.mark.parametrize(
    ("alteracao", "campo", "mensagem"),
    [
        ({"desconto": -1}, "desconto", "Use um valor entre 0 e 1000."),
        (
            {"preco_venda": 20, "desconto": 25},
            "desconto",
            "O desconto não pode ser maior que o preço.",
        ),
        ({"preco_venda": 10.123}, "preco_venda", "Use no máximo 2 casas decimais."),
        ({"preco_venda": "35"}, "preco_venda", "Informe um número."),
        ({"pedidos": 10.5}, "pedidos", "Use um número inteiro."),
    ],
)
def test_entrada_invalida_recebe_mensagem_no_proprio_campo(alteracao, campo, mensagem):
    resposta = _simular(**alteracao)

    assert resposta.status_code == 422
    assert resposta.json() == {"erros": {campo: mensagem}}


@pytest.mark.parametrize("literal", ["NaN", "Infinity", "-Infinity", "1e999"])
def test_numero_nao_finito_no_json_e_rejeitado_no_campo(literal):
    outros = {chave: valor for chave, valor in PADRAO.items() if chave != "preco_venda"}
    corpo = json.dumps(outros)[:-1] + f', "preco_venda": {literal}}}'

    resposta = cliente.post("/api/simulacoes", content=corpo, headers=CABECALHO_JSON)

    assert resposta.status_code == 422
    assert resposta.json() == {"erros": {"preco_venda": "Informe um número finito."}}


def test_campo_ausente_e_campo_desconhecido():
    incompleto = {chave: valor for chave, valor in PADRAO.items() if chave != "pedidos"}

    resposta = cliente.post("/api/simulacoes", json={**incompleto, "extra": 1})

    assert resposta.status_code == 422
    assert resposta.json() == {
        "erros": {"pedidos": "Campo obrigatório.", "extra": "Campo não reconhecido."}
    }


@pytest.mark.parametrize(
    ("conteudo", "cabecalhos"),
    [
        (None, {}),
        ("", CABECALHO_JSON),
        ("{quebrado", CABECALHO_JSON),
        ("[1, 2]", CABECALHO_JSON),
        ("null", CABECALHO_JSON),
        ("oi", {"Content-Type": "text/plain"}),
        ('{"pedidos": ' + "1" * 5000 + "}", CABECALHO_JSON),
        (b'{"pedidos": "\xff"}', CABECALHO_JSON),
    ],
    ids=[
        "sem_corpo",
        "corpo_vazio",
        "malformado",
        "lista",
        "nulo",
        "outro_tipo_de_conteudo",
        "numero_de_5000_digitos",
        "bytes_invalidos",
    ],
)
def test_corpo_ilegivel_recebe_o_mesmo_erro_compreensivel(conteudo, cabecalhos):
    resposta = cliente.post("/api/simulacoes", content=conteudo, headers=cabecalhos)

    assert resposta.status_code == 422
    assert resposta.json() == CORPO_INVALIDO


def test_erro_inesperado_nao_expoe_detalhes_internos(monkeypatch):
    def falhar(_):
        raise RuntimeError("segredo interno")

    monkeypatch.setattr(modulo_api, "executar_simulacao", falhar)
    cliente_sem_excecoes = TestClient(app, raise_server_exceptions=False)

    resposta = cliente_sem_excecoes.post("/api/simulacoes", json=PADRAO)

    assert resposta.status_code == 500
    assert "segredo" not in resposta.text
    assert "Traceback" not in resposta.text


def test_rota_inexistente_nao_e_afetada_pelo_tratamento_de_erros():
    assert cliente.get("/api/nada").status_code == 404


@pytest.mark.parametrize("rota", ["/docs", "/redoc"])
def test_paginas_de_documentacao_que_dependem_de_cdn_estao_desligadas(rota):
    assert cliente.get(rota).status_code == 404


def test_pagina_identifica_a_simulacao_e_explica_os_resultados():
    pagina = cliente.get("/")
    texto = " ".join(pagina.text.split())

    assert pagina.status_code == 200
    assert "Simulação ilustrativa com dados fictícios — sem IA conectada" in texto
    assert "Contribuição não é lucro líquido" in texto
    assert "Impostos, salários, aluguel e desperdício" in texto
    assert "A demanda é informada por você" in texto
    assert 'id="cena"' in texto
    assert 'data-estacao="preparo"' in texto
    assert 'data-estacao="embalagem"' in texto


def test_pagina_orienta_o_primeiro_uso_e_separa_o_momento_do_turno_completo():
    texto = " ".join(cliente.get("/").text.split())

    assert "Ajuste seu cenário." in texto
    assert "Veja o resultado do turno." in texto
    assert "Acompanhe os pedidos no restaurante." in texto
    assert "Ver resultados" in texto
    assert "Resultado financeiro do turno completo" in texto
    assert 'id="reproducao-alternar"' in texto
    assert 'id="reproducao-velocidade"' in texto


def test_pagina_usa_termos_familiares_ajuda_e_avisos_da_comparacao():
    texto = " ".join(cliente.get("/").text.split())

    assert "Valor que sobra após os custos por pedido" in texto
    assert "margem de contribuição" in texto
    assert "Capacidade estimada neste modelo" in texto
    assert "Recarregar a página descarta o cenário A" in texto
    assert "os valores atuais do formulário serão substituídos" in texto
    assert 'id="exemplos"' in texto
    assert 'id="resumo"' in texto
    assert 'id="a-salvar"' in texto


@pytest.mark.parametrize(
    ("caminho", "tipo"),
    [
        ("/estilos.css", "text/css"),
        ("/js/api.js", "javascript"),
        ("/js/execucao.js", "javascript"),
        ("/js/formulario.js", "javascript"),
        ("/js/indicadores.js", "javascript"),
        ("/js/principal.js", "javascript"),
        ("/js/cena/geometria.js", "javascript"),
        ("/js/cena/modelo.js", "javascript"),
        ("/js/cena/deteccao.js", "javascript"),
        ("/js/cena/desenho.js", "javascript"),
        ("/js/cena/pagina.js", "javascript"),
        ("/js/cena/linha-do-tempo.js", "javascript"),
        ("/js/cena/reproducao.js", "javascript"),
        ("/js/navegacao.js", "javascript"),
        ("/js/comparacao.js", "javascript"),
        ("/js/comparacao-pagina.js", "javascript"),
        ("/js/exemplos.js", "javascript"),
    ],
)
def test_arquivos_da_interface_sao_servidos_na_mesma_origem(caminho, tipo):
    resposta = cliente.get(caminho)

    assert resposta.status_code == 200
    assert tipo in resposta.headers["content-type"]


def test_interface_nao_carrega_nada_de_fora():
    for arquivo in PASTA_WEB.rglob("*"):
        if arquivo.is_file():
            conteudo = arquivo.read_text(encoding="utf-8")
            assert not re.search(r"https?://|//cdn|@import", conteudo), arquivo.name
