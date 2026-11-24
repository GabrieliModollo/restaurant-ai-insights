"""Regras da promoção, com valores conferidos independentemente das fórmulas do módulo."""
import pytest
from fastapi.testclient import TestClient

from src.simulador.api import app
from src.simulador.parametros import campos_para_interface, ParametrosSimulacao
from src.simulador.promocoes import (
    ParametrosPromocao, analisar_promocao, calcular_equilibrio, variacao_percentual,
)
from src.simulador.simulacao import executar_simulacao
from src.simulador.operacao import simular_operacao

PADRAO = {c["nome"]: c["padrao"] for c in campos_para_interface()}
cliente = TestClient(app)


def analisar(base=None, promocional=None):
    return analisar_promocao(ParametrosPromocao.model_validate({
        "base": {**PADRAO, **(base or {})},
        "promocional": {**PADRAO, **(promocional or {})},
    }))


def test_sem_desconto_iguala_base_e_preserva_contrato_antigo():
    r = analisar()
    assert r["base"] == r["promocional"]
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 18
    assert r["equilibrio"]["adicionais_sobre_base"] == 0
    assert r["equilibrio"]["situacao"] == "meta_atingida"
    antigo = executar_simulacao(ParametrosSimulacao.model_validate(PADRAO))
    assert set(antigo) == {"financeiro", "operacao", "resumo"}
    for nome, valor in antigo["financeiro"].items():
        assert r["base"][nome] == valor
    assert cliente.post('/api/simulacoes', json=PADRAO).json() == antigo


def test_desconto_com_demanda_constante_reduz_contribuicao_e_exige_25_conclusoes():
    r = analisar(promocional={"desconto": 5})
    assert r["base"]["contribuicao_total_centavos"] == 28350
    assert r["promocional"]["contribuicao_por_pedido_centavos"] == 1150
    assert r["promocional"]["contribuicao_total_centavos"] == 20700
    assert r["diferencas"]["contribuicao_por_pedido_centavos"]["absoluta"] == -425
    assert r["diferencas"]["contribuicao_total_centavos"]["percentual"] == pytest.approx(-26.9841269841)
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 25
    assert r["equilibrio"]["adicionais_sobre_base"] == 7
    assert r["equilibrio"]["situacao"] == "capacidade_insuficiente"
    assert r["equilibrio"]["maximo_concluidos_no_limite"] == 22


def test_mais_pedidos_e_so_hipotese_e_nao_gera_capacidade():
    r = analisar(promocional={"desconto": 5, "pedidos": 1000})
    assert r["promocional"]["pedidos_recebidos"] == 1000
    assert r["promocional"]["pedidos_concluidos"] == 22
    assert not r["equilibrio"]["atingiu_na_hipotese"]
    assert any("Recebidos não são concluídos" in a for a in r["alertas"])


def test_hipotese_de_volume_compensa_quando_ha_capacidade():
    equipe = {"pessoas_preparo": 10, "pessoas_embalagem": 10}
    r = analisar(base=equipe, promocional={**equipe, "pedidos": 35, "desconto": 5})
    assert r["equilibrio"]["situacao"] == "meta_atingida"
    assert r["promocional"]["contribuicao_total_centavos"] >= r["base"]["contribuicao_total_centavos"]
    assert r["promocional"]["contribuicao_por_pedido_centavos"] < r["base"]["contribuicao_por_pedido_centavos"]


def test_volume_atual_insuficiente_mas_meta_cabe_no_modelo():
    r = analisar(base={"pedidos": 5}, promocional={"pedidos": 5, "desconto": 5})
    assert r["equilibrio"]["situacao"] == "volume_insuficiente"
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 7


@pytest.mark.parametrize('margem', [0, -1, -550])
def test_margem_nao_positiva_nao_recupera_base_positiva(margem):
    assert calcular_equilibrio(28350, margem, 18)["pedidos_concluidos_minimos"] is None


def test_promocao_negativa_alerta_sem_sugerir_vender_mais():
    r = analisar(promocional={"desconto": 25})
    assert r["promocional"]["contribuicao_por_pedido_centavos"] == -550
    assert r["equilibrio"]["situacao"] == "impossivel_financeiramente"
    assert any("Vender mais amplia" in a for a in r["alertas"])


def test_promocao_zero_alerta():
    r = analisar(promocional={"preco_venda": 20, "desconto": 0, "taxa_canal_pct": 30})
    assert r["promocional"]["contribuicao_por_pedido_centavos"] == 0
    assert r["equilibrio"]["situacao"] == "impossivel_financeiramente"


@pytest.mark.parametrize('u, minimo, maximo', [(50, 0, None), (0, 0, None), (-30, 0, 3)])
def test_base_negativa_resolve_intervalo_correto(u, minimo, maximo):
    meta = calcular_equilibrio(-100, u, 8)
    assert meta["pedidos_concluidos_minimos"] == minimo
    assert meta["pedidos_concluidos_maximos"] == maximo
    for n in range(10):
        assert (n * u >= -100) == (n >= minimo and (maximo is None or n <= maximo))


def test_base_negativa_piorada_nao_anuncia_volume_insuficiente():
    r = analisar(base={"desconto": 25}, promocional={"desconto": 30})
    assert r["equilibrio"]["situacao"] == "limite_de_perda_excedido"
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 0
    assert r["equilibrio"]["pedidos_concluidos_maximos"] == 10
    assert any("base tem contribuição total negativa" in a for a in r["alertas"])


def test_zero_pedidos_e_percentual_indefinido():
    r = analisar(base={"pedidos": 0}, promocional={"pedidos": 0, "desconto": 5})
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 0
    assert r["diferencas"]["contribuicao_total_centavos"]["percentual"] is None
    assert variacao_percentual(-100, -80) == 20
    assert calcular_equilibrio(0, -50, 0)["pedidos_concluidos_maximos"] == 0


def test_meta_acima_dos_limites_nao_e_prometida():
    r = analisar(promocional={"preco_venda": 14.01, "desconto": 0, "taxa_canal_pct": 0})
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 28350
    assert r["equilibrio"]["situacao"] == "fora_dos_limites"


def test_arredondamento_taxa_por_pedido_e_teto_sem_float():
    r = analisar(base={"preco_venda": 0.05, "taxa_canal_pct": 10, "custo_ingredientes": 0, "custo_embalagem": 0},
                 promocional={"preco_venda": 0.05, "desconto": 0.01, "taxa_canal_pct": 10, "custo_ingredientes": 0, "custo_embalagem": 0})
    assert r["base"]["taxa_canal_centavos"] == 1
    assert r["promocional"]["taxa_canal_centavos"] == 0
    assert r["base"]["contribuicao_total_centavos"] == 72
    assert r["equilibrio"]["pedidos_concluidos_minimos"] == 18
    assert calcular_equilibrio(10**20 + 1, 3, 0)["pedidos_concluidos_minimos"] == (10**20 + 3) // 3


def test_periodos_e_outros_custos_diferentes_sao_explicitos():
    r = analisar(promocional={"duracao_turno_min": 120, "custo_ingredientes": 10})
    assert any("períodos diferentes" in a for a in r["alertas"])
    assert any("Ingredientes" in a for a in r["alertas"])


def test_endpoint_novo_nao_expoe_eventos_e_aceita_numeros_normais():
    resposta = cliente.post('/api/promocoes', json={"base": PADRAO, "promocional": {**PADRAO, "desconto": 5}})
    assert resposta.status_code == 200
    assert 'eventos' not in resposta.text
    assert resposta.json()["equilibrio"]["pedidos_concluidos_minimos"] == 25


@pytest.mark.parametrize('campo,valor', [('desconto', -1), ('desconto', 36), ('pedidos', 1001), ('pedidos', True), ('pedidos', 1.5), ('taxa_canal_pct', '10'), ('preco_venda', 0), ('desconto', 0.001)])
@pytest.mark.parametrize('cenario', ['base', 'promocional'])
def test_campos_invalidos_recebem_erro_qualificado(campo, valor, cenario):
    corpo = {"base": dict(PADRAO), "promocional": dict(PADRAO)}
    corpo[cenario][campo] = valor
    resposta = cliente.post('/api/promocoes', json=corpo)
    assert resposta.status_code == 422
    assert f'{cenario}.{campo}' in resposta.json()["erros"]


@pytest.mark.parametrize('corpo', [{}, {"base": PADRAO}, {"base": PADRAO, "promocional": PADRAO, "extra": 1}, []])
def test_corpo_invalido_e_campos_extras(corpo):
    assert cliente.post('/api/promocoes', json=corpo).status_code == 422


@pytest.mark.parametrize('total,unitario', [(0, 0), (0, -1), (-100, -30), (-100, 50), (100, 30), (100, -30), (100, 0)])
def test_intervalo_soluciona_desigualdade_em_todos_os_inteiros_testados(total, unitario):
    e = calcular_equilibrio(total, unitario, 0)
    minimo, maximo = e['pedidos_concluidos_minimos'], e['pedidos_concluidos_maximos']
    for n in range(31):
        admissivel = minimo is not None and n >= minimo and (maximo is None or n <= maximo)
        assert admissivel == (n * unitario >= total)


@pytest.mark.parametrize('equipe,tempo', [(1, 2), (2, 5), (3, 1)])
def test_mais_chegadas_nao_reduzem_conclusoes_no_modelo_fifo(equipe, tempo):
    resultados = [simular_operacao(pedidos=n, duracao_turno_min=10, pessoas_preparo=equipe,
        pessoas_embalagem=2, tempo_preparo_min=tempo, tempo_embalagem_min=1)['pedidos_concluidos']
        for n in range(31)]
    assert resultados == sorted(resultados)


def test_desconto_maximo_usa_as_conclusoes_da_hipotese_e_o_centavo_exato():
    promocao = {"pedidos": 22, "desconto": 5}
    resultado = analisar(promocional=promocao)
    assert resultado["promocional"]["pedidos_concluidos"] == 20
    assert resultado["equilibrio"]["maximo_concluidos_no_limite"] == 22
    assert resultado["equilibrio"]["desconto_maximo_centavos"] == 185
    assert analisar(promocional={**promocao, "desconto": 1.85})["equilibrio"]["atingiu_na_hipotese"]
    assert not analisar(promocional={**promocao, "desconto": 1.86})["equilibrio"]["atingiu_na_hipotese"]


def test_desconto_maximo_distingue_zero_de_sem_alternativa():
    assert analisar(promocional={"desconto": 5})["equilibrio"]["desconto_maximo_centavos"] == 0
    for pedidos in [0, 10]:
        assert analisar(promocional={"pedidos": pedidos})["equilibrio"]["desconto_maximo_centavos"] is None


def test_mudanca_de_equipe_avisa_que_o_custo_adicional_fica_fora_da_contribuicao():
    resultado = analisar(promocional={"desconto": 5, "pedidos": 30, "pessoas_preparo": 3})
    assert resultado["promocional"]["pedidos_concluidos"] == 27
    assert resultado["equilibrio"]["atingiu_na_hipotese"]
    assert any("custo adicional de pessoal" in alerta for alerta in resultado["alertas"])


def enviar_alternativas(**alteracoes):
    return cliente.post("/api/promocoes/alternativas", json={
        "base": PADRAO,
        "promocional": {**PADRAO, "desconto": 5, "pedidos": 30},
        "desconto_menor_centavos": 300,
        "estacao": "pessoas_preparo",
        "custo_adicional_centavos": 2010,
        **alteracoes,
    })


@pytest.mark.parametrize(("custo", "diferenca"), [(0, 2010), (2009, 1), (2010, 0), (2011, -1), (40000, -37990)])
def test_comparar_alternativas_preserva_centavos_e_desconta_custo(custo, diferenca):
    resposta = enviar_alternativas(custo_adicional_centavos=custo)
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["referencia_centavos"] == 28350
    assert dados["desconto_menor"] == {
        "pedidos_prontos": 22, "contribuicao_centavos": 29040,
        "custo_adicional_centavos": 0, "resultado_ajustado_centavos": 29040,
    }
    assert dados["reforco_equipe"]["pedidos_prontos"] == 27
    assert dados["reforco_equipe"]["contribuicao_centavos"] == 31050
    assert dados["reforco_equipe"]["resultado_ajustado_centavos"] == 31050 - custo
    assert dados["diferenca_reforco_centavos"] == diferenca


@pytest.mark.parametrize("alteracoes", [
    {"desconto_menor_centavos": 500},
    {"custo_adicional_centavos": -1},
    {"custo_adicional_centavos": 20.1},
    {"promocional": {**PADRAO, "desconto": 5, "pessoas_preparo": 50}},
])
def test_comparar_alternativas_rejeita_entradas_invalidas(alteracoes):
    assert enviar_alternativas(**alteracoes).status_code == 422


def test_comparar_alternativas_sinaliza_referencia_com_duracao_diferente():
    resposta = enviar_alternativas(base={**PADRAO, "duracao_turno_min": 120})
    assert resposta.status_code == 200
    assert resposta.json()["turnos_diferentes"] is True


CANAL_A = {
    "comissao_bps": 1500, "pagamento_bps": 0, "frete_loja_centavos": 0,
    "desconto_loja_centavos": 500, "subsidio_plataforma_centavos": 0,
}
CANAL_B = {
    "comissao_bps": 1000, "pagamento_bps": 200, "frete_loja_centavos": 200,
    "desconto_loja_centavos": 200, "subsidio_plataforma_centavos": 300,
}


def enviar_canais(canal_a=None, canal_b=None, promocao=None, base=None):
    return cliente.post("/api/promocoes/canais", json={
        "base": {**PADRAO, **(base or {})},
        "promocional": {**PADRAO, "desconto": 5, **(promocao or {})},
        "canal_a": {**CANAL_A, **(canal_a or {})},
        "canal_b": {**CANAL_B, **(canal_b or {})},
    })


def test_canais_mantem_oferta_operacao_e_referencia():
    resposta = enviar_canais()
    assert resposta.status_code == 200
    dados = resposta.json()
    assert (dados["preco_cliente_centavos"], dados["referencia_centavos"]) == (3000, 28350)
    assert (dados["pedidos_recebidos"], dados["pedidos_prontos"]) == (20, 18)
    a, b = dados["canal_a"], dados["canal_b"]
    assert a["contribuicao_total_centavos"] == 20700
    assert b["valor_loja_por_pedido_centavos"] == 3300
    assert (b["comissao_por_pedido_centavos"], b["pagamento_por_pedido_centavos"]) == (330, 66)
    assert b["contribuicao_total_centavos"] == 23472
    assert dados["diferenca_b_menos_a_centavos"] == 2772


def test_canais_arredondam_cada_taxa_por_pedido():
    dados = enviar_canais(canal_a={"comissao_bps": 5, "pagamento_bps": 5}).json()
    a = dados["canal_a"]
    assert (a["comissao_por_pedido_centavos"], a["pagamento_por_pedido_centavos"]) == (2, 2)
    assert a["contribuicao_total_centavos"] == 1596 * 18


@pytest.mark.parametrize("invalido", [
    {"subsidio_plataforma_centavos": 1}, {"frete_loja_centavos": -1},
    {"pagamento_bps": 10001}, {"comissao_bps": 15.5},
])
def test_canais_validam_divisao_do_desconto_e_limites(invalido):
    assert enviar_canais(canal_a=invalido).status_code == 422


def test_canais_sem_pedidos_comparam_totais_zero_e_sinalizam_duracao():
    dados = enviar_canais(promocao={"pedidos": 0}, base={"duracao_turno_min": 120}).json()
    assert dados["pedidos_prontos"] == dados["diferenca_b_menos_a_centavos"] == 0
    assert dados["turnos_diferentes"]


@pytest.mark.parametrize(("pergunta", "fontes"), [
    ("Quem banca o cupom no iFood?", {"ifood-promocoes"}),
    ("Qual é a taxa de pagamento da 99 Food?", {"99food-cobrancas"}),
    ("Como é calculada a comissão no iFood?", {"ifood-planos"}),
    ("Quanto a loja paga de frete na 99Food?", {"99food-cobrancas"}),
    ("Quem paga a entrega no iFood?", {"ifood-planos"}),
    ("Por que a contribuição da promoção é diferente no iFood e na 99Food?",
     {"ifood-planos", "ifood-promocoes", "99food-cobrancas", "99food-promocoes"}),
])
def test_consulta_comercial_recupera_fontes_por_tema_e_plataforma(pergunta, fontes):
    resposta = cliente.post("/api/promocoes/regras", json={"pergunta": pergunta})
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["situacao"] == "com_fontes"
    assert {fonte["id"] for fonte in dados["fontes"]} == fontes
    assert all(fonte["url"].startswith("https://") and fonte["consultado_em"] for fonte in dados["fontes"])
    assert "contrato" in dados["orientacao"]


def test_consulta_comercial_pede_apenas_dados_ainda_nao_confirmados():
    dados = cliente.post("/api/promocoes/regras", json={
        "pergunta": "Quem financia o desconto no iFood?",
        "confirmados": ["desconto_loja_centavos"],
    }).json()
    assert dados["dados_faltantes"] == ["subsídio da plataforma"]


@pytest.mark.parametrize("pergunta", [
    "Como alterar minha senha no iFood?",
    "Qual é a comissão da Rappi?",
    "Qual é a taxa para anunciar um produto?",
    "Como rastrear a entrega no iFood?",
    "Qual é a taxa de cancelamento no iFood?",
    "Como comparar cardápios?",
    "Como funciona o pagamento do entregador?",
])
def test_consulta_comercial_se_abstem_quando_falta_fonte(pergunta):
    dados = cliente.post("/api/promocoes/regras", json={"pergunta": pergunta}).json()
    assert dados["situacao"] == "sem_fonte"
    assert dados["fontes"] == dados["dados_faltantes"] == []


@pytest.mark.parametrize("pergunta", ["  ", "x" * 301])
def test_consulta_comercial_valida_tamanho(pergunta):
    assert cliente.post("/api/promocoes/regras", json={"pergunta": pergunta}).status_code == 422
