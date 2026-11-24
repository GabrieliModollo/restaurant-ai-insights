"""Custo de ingredientes de uma porção, calculado no servidor."""

from datetime import date
from fractions import Fraction
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt, StringConstraints, field_validator, model_validator

from .parametros import CAMPOS

Unidade = Literal["g", "kg", "ml", "l", "un"]
MEDIDAS = {
    "g": ("massa", 1),
    "kg": ("massa", 1000),
    "ml": ("volume", 1),
    "l": ("volume", 1000),
    "un": ("contagem", 1),
}
Quantidade = StrictInt | StrictFloat
Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
DataPreco = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class Ingrediente(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome
    preco_compra_centavos: Annotated[int, Field(strict=True, ge=0, le=10_000_000)]
    quantidade_comprada: Quantidade
    unidade_compra: Unidade
    quantidade_usada: Quantidade
    unidade_uso: Unidade
    data_preco: DataPreco

    @field_validator("quantidade_comprada", "quantidade_usada")
    @classmethod
    def validar_quantidade(cls, valor: int | float) -> int | float:
        if not 0.001 <= valor <= 1_000_000:
            raise ValueError("Use uma quantidade entre 0,001 e 1.000.000.")
        if (Fraction(str(valor)) * 1000).denominator != 1:
            raise ValueError("Use no máximo três casas decimais.")
        return valor

    @field_validator("data_preco")
    @classmethod
    def validar_data(cls, valor: str) -> str:
        try:
            date.fromisoformat(valor)
        except ValueError:
            raise ValueError("Informe uma data de preço válida.") from None
        return valor

    @model_validator(mode="after")
    def validar_unidades(self) -> "Ingrediente":
        if MEDIDAS[self.unidade_compra][0] != MEDIDAS[self.unidade_uso][0]:
            raise ValueError("Use unidades da mesma medida, como kg e g ou L e mL.")
        return self

    def custo_centavos(self) -> Fraction:
        comprado = Fraction(str(self.quantidade_comprada)) * MEDIDAS[self.unidade_compra][1]
        usado = Fraction(str(self.quantidade_usada)) * MEDIDAS[self.unidade_uso][1]
        return self.preco_compra_centavos * usado / comprado


class FichaTecnica(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ingredientes: Annotated[list[Ingrediente], Field(min_length=1, max_length=20)]


def calcular_ficha_tecnica(ficha: FichaTecnica) -> dict:
    custos = [ingrediente.custo_centavos() for ingrediente in ficha.ingredientes]
    # Arredonda uma vez, depois da soma exata de todos os ingredientes.
    total_centavos = int(sum(custos) + Fraction(1, 2))
    limite = next(campo.maximo for campo in CAMPOS if campo.nome == "custo_ingredientes")
    return {
        "total_centavos": total_centavos,
        "aplicavel_ao_simulador": total_centavos <= limite * 100,
        "itens": [
            {"nome": ingrediente.nome, "data_preco": ingrediente.data_preco, "custo_reais": float(custo / 100)}
            for ingrediente, custo in zip(ficha.ingredientes, custos, strict=True)
        ],
    }
