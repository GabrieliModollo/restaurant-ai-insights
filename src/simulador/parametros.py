"""Parâmetros aceitos pelo simulador: limites, valores iniciais e validação.

A tabela CAMPOS é a fonte única desses limites. O servidor valida com ela, e o
navegador a recebe por GET /api/campos para montar o formulário.
"""

from dataclasses import asdict, dataclass
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError


@dataclass(frozen=True)
class Campo:
    nome: str
    rotulo: str
    unidade: str
    grupo: str
    minimo: Decimal
    maximo: Decimal
    padrao: Decimal
    maximo_slider: Decimal  # faixa comum do slider; digitando, vale até `maximo`
    passo_slider: Decimal
    casas: int = 2  # casas decimais aceitas; 0 significa número inteiro
    maximo_campo: str | None = None  # outro campo que limita este
    dica: str | None = None


GRUPO_PEDIDOS = "Preço e pedidos"
GRUPO_CUSTOS = "Custos por pedido"
GRUPO_EQUIPE = "Equipe e tempos"


def _dinheiro(nome, rotulo, grupo, padrao, maximo_slider, minimo="0", **extras):
    return Campo(
        nome=nome,
        rotulo=rotulo,
        unidade="R$",
        grupo=grupo,
        minimo=Decimal(minimo),
        maximo=Decimal("1000"),
        padrao=Decimal(padrao),
        maximo_slider=Decimal(maximo_slider),
        passo_slider=Decimal("0.5"),
        **extras,
    )


def _inteiro(nome, rotulo, unidade, grupo, minimo, maximo, padrao, maximo_slider, **extras):
    return Campo(
        nome=nome,
        rotulo=rotulo,
        unidade=unidade,
        grupo=grupo,
        minimo=Decimal(minimo),
        maximo=Decimal(maximo),
        padrao=Decimal(padrao),
        maximo_slider=Decimal(maximo_slider),
        passo_slider=Decimal(1),
        casas=0,
        **extras,
    )


def _tempo(nome, rotulo, padrao):
    return Campo(
        nome=nome,
        rotulo=rotulo,
        unidade="min",
        grupo=GRUPO_EQUIPE,
        minimo=Decimal("0.1"),
        maximo=Decimal("240"),
        padrao=Decimal(padrao),
        maximo_slider=Decimal("30"),
        passo_slider=Decimal("0.5"),
    )


CAMPOS = (
    _dinheiro("preco_venda", "Preço de venda", GRUPO_PEDIDOS, "35", "100", minimo="0.01"),
    _dinheiro(
        "desconto",
        "Desconto por pedido",
        GRUPO_PEDIDOS,
        "0",
        "50",
        maximo_campo="preco_venda",
        dica="Custeado pelo restaurante. Não altera os pedidos sozinho.",
    ),
    _inteiro(
        "pedidos",
        "Pedidos recebidos no turno",
        "pedidos",
        GRUPO_PEDIDOS,
        0,
        1000,
        20,
        200,
        dica="É a sua hipótese de demanda; o simulador não a estima.",
    ),
    _dinheiro("custo_ingredientes", "Ingredientes por pedido", GRUPO_CUSTOS, "12", "50"),
    _dinheiro("custo_embalagem", "Embalagem por pedido", GRUPO_CUSTOS, "2", "20"),
    Campo(
        nome="taxa_canal_pct",
        rotulo="Taxa do canal",
        unidade="%",
        grupo=GRUPO_CUSTOS,
        minimo=Decimal(0),
        maximo=Decimal(100),
        padrao=Decimal(15),
        maximo_slider=Decimal(40),
        passo_slider=Decimal("0.5"),
        dica="Percentual cobrado pelo aplicativo ou canal de venda, sobre o preço com desconto.",
    ),
    _inteiro("pessoas_preparo", "Pessoas no preparo", "pessoas", GRUPO_EQUIPE, 1, 50, 2, 10),
    _inteiro("pessoas_embalagem", "Pessoas na embalagem", "pessoas", GRUPO_EQUIPE, 1, 50, 1, 10),
    _tempo("tempo_preparo_min", "Tempo de preparo por pedido", "5"),
    _tempo("tempo_embalagem_min", "Tempo de embalagem por pedido", "2"),
    _inteiro("duracao_turno_min", "Duração do turno", "min", GRUPO_EQUIPE, 1, 720, 60, 240),
)

_CAMPOS_POR_NOME = {campo.nome: campo for campo in CAMPOS}

# Só guardam parâmetros: o resultado vem sempre do fluxo normal de validação e cálculo.
_EXEMPLOS = (
    {
        "id": "pouca_espera",
        "titulo": "Exemplo fictício: operação com pouca espera",
        "o_que_explorar": "A equipe dá conta dos pedidos. Veja a espera e o que fica pendente.",
        "alteracoes": {"pedidos": 15},
    },
    {
        "id": "acumulo_preparo",
        "titulo": "Exemplo fictício: acúmulo no preparo",
        "o_que_explorar": (
            "Chegam mais pedidos do que o preparo atende. Veja onde eles acumulam e mude a equipe."
        ),
        "alteracoes": {"pedidos": 60, "pessoas_embalagem": 3},
    },
    {
        "id": "desconto",
        "titulo": "Exemplo fictício: desconto com o mesmo volume de pedidos",
        "o_que_explorar": (
            "O número de pedidos não muda. Veja o efeito do desconto sobre o valor que sobra."
        ),
        "alteracoes": {"desconto": 5},
    },
)


def campos_para_interface() -> list[dict]:
    """Descreve os campos em JSON para o navegador montar o formulário."""
    return [
        {
            chave: float(valor) if isinstance(valor, Decimal) else valor
            for chave, valor in asdict(campo).items()
        }
        for campo in CAMPOS
    ]


def exemplos_para_interface() -> list[dict]:
    """Exemplos com todos os parâmetros: o valor inicial de cada campo, mais as alterações."""
    padroes = {campo.nome: float(campo.padrao) for campo in CAMPOS}
    return [
        {
            "id": exemplo["id"],
            "titulo": exemplo["titulo"],
            "o_que_explorar": exemplo["o_que_explorar"],
            "parametros": {**padroes, **exemplo["alteracoes"]},
        }
        for exemplo in _EXEMPLOS
    ]


def _texto_numero(valor: Decimal) -> str:
    return format(valor.normalize(), "f").replace(".", ",")


def _erro(codigo: str, mensagem: str) -> PydanticCustomError:
    return PydanticCustomError(codigo, mensagem)


def _validar_campo(campo: Campo, valor: object) -> Decimal | int:
    # bool é um tipo de int em Python: sem esta checagem, `true` viraria 1.
    if isinstance(valor, bool) or not isinstance(valor, (int, float, Decimal)):
        raise _erro("nao_numerico", "Informe um número.")

    # float passa por texto para que 0.1 vire Decimal("0.1"), e não sua aproximação binária.
    numero = Decimal(str(valor)) if isinstance(valor, float) else Decimal(valor)

    if not numero.is_finite():
        raise _erro("nao_finito", "Informe um número finito.")

    if not campo.minimo <= numero <= campo.maximo:
        raise _erro(
            "fora_dos_limites",
            f"Use um valor entre {_texto_numero(campo.minimo)} e {_texto_numero(campo.maximo)}.",
        )

    if campo.casas == 0:
        if numero != numero.to_integral_value():
            raise _erro("nao_inteiro", "Use um número inteiro.")
        return int(numero)

    # A comparação é exata; normalize() arredondaria o valor aos 28 dígitos do contexto padrão.
    if numero != numero.quantize(Decimal(1).scaleb(-campo.casas)):
        raise _erro("casas_decimais", f"Use no máximo {campo.casas} casas decimais.")
    return numero


class ParametrosSimulacao(BaseModel):
    """Corpo de POST /api/simulacoes. A ordem importa: preco_venda vem antes de desconto."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    preco_venda: Decimal
    desconto: Decimal
    pedidos: int
    custo_ingredientes: Decimal
    custo_embalagem: Decimal
    taxa_canal_pct: Decimal
    pessoas_preparo: int
    pessoas_embalagem: int
    tempo_preparo_min: Decimal
    tempo_embalagem_min: Decimal
    duracao_turno_min: int

    @field_validator("*", mode="before")
    @classmethod
    def _dentro_dos_limites(cls, valor: object, info: ValidationInfo):
        return _validar_campo(_CAMPOS_POR_NOME[info.field_name], valor)

    @field_validator("desconto")
    @classmethod
    def _desconto_ate_o_preco(cls, valor: Decimal, info: ValidationInfo) -> Decimal:
        preco = info.data.get("preco_venda")  # ausente se o preço já foi rejeitado
        if preco is not None and valor > preco:
            raise _erro("desconto_acima_do_preco", "O desconto não pode ser maior que o preço.")
        return valor
