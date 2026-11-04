"""Validação direta dos parâmetros, sem HTTP. Os limites vêm sempre de CAMPOS."""

import json
from decimal import Decimal

import pytest
from pydantic import ValidationError

from src.simulador.parametros import CAMPOS, ParametrosSimulacao, campos_para_interface

PADRAO = {campo.nome: campo.padrao for campo in CAMPOS}

# Preço máximo e sem desconto: assim o limite de um campo não esbarra na regra de outro.
BASE_PARA_LIMITES = {**PADRAO, "preco_venda": Decimal(1000), "desconto": Decimal(0)}


def _parametros(**alteracoes):
    return ParametrosSimulacao(**{**PADRAO, **alteracoes})


def _erros(**alteracoes):
    """Devolve {campo: (tipo do erro, mensagem)} de uma validação que deve falhar."""
    with pytest.raises(ValidationError) as excecao:
        _parametros(**alteracoes)
    return {erro["loc"][0]: (erro["type"], erro["msg"]) for erro in excecao.value.errors()}


def test_valores_iniciais_sao_validos_e_o_turno_inicial_tem_60_minutos():
    parametros = _parametros()

    assert parametros.duracao_turno_min == 60


@pytest.mark.parametrize("campo", CAMPOS, ids=lambda campo: campo.nome)
def test_limites_de_cada_campo_sao_inclusivos(campo):
    for valor in (campo.minimo, campo.maximo):
        parametros = ParametrosSimulacao(**{**BASE_PARA_LIMITES, campo.nome: valor})

        assert getattr(parametros, campo.nome) == valor


@pytest.mark.parametrize("campo", CAMPOS, ids=lambda campo: campo.nome)
def test_valor_fora_dos_limites_e_rejeitado_no_proprio_campo(campo):
    margem = Decimal(1) if campo.casas == 0 else Decimal("0.01")

    for valor in (campo.minimo - margem, campo.maximo + margem):
        with pytest.raises(ValidationError) as excecao:
            ParametrosSimulacao(**{**BASE_PARA_LIMITES, campo.nome: valor})

        erros = {erro["loc"][0]: erro["type"] for erro in excecao.value.errors()}
        assert erros == {campo.nome: "fora_dos_limites"}


def test_zero_pedidos_e_aceito():
    assert _parametros(pedidos=0).pedidos == 0


def test_desconto_negativo_e_rejeitado():
    assert _erros(desconto=Decimal("-0.01"))["desconto"][0] == "fora_dos_limites"


def test_desconto_maior_que_o_preco_e_rejeitado():
    erros = _erros(preco_venda=Decimal("20"), desconto=Decimal("20.01"))

    assert erros == {
        "desconto": ("desconto_acima_do_preco", "O desconto não pode ser maior que o preço.")
    }


def test_desconto_igual_ao_preco_e_aceito():
    parametros = _parametros(preco_venda=Decimal("20"), desconto=Decimal("20"))

    assert parametros.desconto == parametros.preco_venda


def test_preco_invalido_nao_gera_erro_duplicado_no_desconto():
    erros = _erros(preco_venda=Decimal("0"), desconto=Decimal("5"))

    assert set(erros) == {"preco_venda"}


def test_mais_de_duas_casas_decimais_e_rejeitado():
    assert _erros(preco_venda=Decimal("10.123"))["preco_venda"][0] == "casas_decimais"


def test_casas_decimais_alem_da_precisao_padrao_do_decimal_tambem_sao_rejeitadas():
    # O contexto padrão do Decimal tem 28 dígitos: uma conta que passe por ele arredondaria
    # este valor para 10 e aceitaria um preço com 31 casas decimais.
    assert (
        _erros(preco_venda=Decimal("10.0000000000000000000000000000001"))["preco_venda"][0]
        == "casas_decimais"
    )


def test_zeros_a_direita_nao_contam_como_casas_decimais():
    assert _parametros(preco_venda=Decimal("10.1000")).preco_venda == Decimal("10.1")


def test_valor_fracionario_e_rejeitado_em_campo_inteiro():
    assert _erros(pedidos=10.5)["pedidos"][0] == "nao_inteiro"


def test_campos_inteiros_chegam_como_int_e_monetarios_como_decimal():
    parametros = _parametros(pedidos=20.0, preco_venda=35)

    assert type(parametros.pedidos) is int
    assert type(parametros.preco_venda) is Decimal


@pytest.mark.parametrize("valor", ["35", None, True, [1], {"valor": 1}])
def test_valor_nao_numerico_e_rejeitado(valor):
    assert _erros(preco_venda=valor)["preco_venda"][0] == "nao_numerico"


@pytest.mark.parametrize(
    "valor", [float("nan"), float("inf"), float("-inf"), Decimal("NaN"), Decimal("sNaN")]
)
def test_valor_nao_finito_e_rejeitado(valor):
    assert _erros(preco_venda=valor)["preco_venda"][0] == "nao_finito"


def test_inteiro_gigante_recebe_a_mensagem_de_limites():
    # Converter para texto falharia: o Python limita int → str a 4300 dígitos.
    tipo, mensagem = _erros(pedidos=10**5000)["pedidos"]

    assert tipo == "fora_dos_limites"
    assert mensagem == "Use um valor entre 0 e 1000."


def test_campo_ausente_e_campo_desconhecido_sao_rejeitados():
    dados = {**PADRAO, "extra": 1}
    del dados["pedidos"]

    with pytest.raises(ValidationError) as excecao:
        ParametrosSimulacao(**dados)

    assert {erro["loc"][0]: erro["type"] for erro in excecao.value.errors()} == {
        "pedidos": "missing",
        "extra": "extra_forbidden",
    }


def test_modelo_e_tabela_de_campos_descrevem_os_mesmos_parametros():
    assert set(ParametrosSimulacao.model_fields) == {campo.nome for campo in CAMPOS}


def test_descricao_dos_campos_vira_json_com_os_mesmos_limites():
    descricao = json.loads(json.dumps(campos_para_interface()))

    assert [item["nome"] for item in descricao] == [campo.nome for campo in CAMPOS]
    for item, campo in zip(descricao, CAMPOS):
        assert item["minimo"] == float(campo.minimo)
        assert item["maximo"] == float(campo.maximo)
        assert item["padrao"] == float(campo.padrao)
