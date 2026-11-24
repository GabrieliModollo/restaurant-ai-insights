"""Formato de arquivo local e recálculo de uma hipótese guardada."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, model_validator

from .canais import CustoCanal, ParametrosCanais, comparar_canais
from .ficha_tecnica import FichaTecnica, calcular_ficha_tecnica
from .parametros import campos_para_interface
from .promocoes import ParametrosAlternativas, ParametrosPromocao, analisar_promocao, comparar_alternativas
from .simulacao import comparar_pico


class OpcoesAlternativas(BaseModel):
    model_config = ConfigDict(extra="forbid")

    desconto_menor_centavos: Annotated[int, Field(strict=True, ge=0)]
    estacao: Literal["pessoas_preparo", "pessoas_embalagem"]
    custo_adicional_centavos: Annotated[int, Field(strict=True, ge=0, le=100_000_000)]


class OpcoesCanais(BaseModel):
    model_config = ConfigDict(extra="forbid")

    canal_a: CustoCanal
    canal_b: CustoCanal


class CenarioSalvo(ParametrosPromocao):
    versao: Literal[1]
    ficha: FichaTecnica | None = None
    alternativas: OpcoesAlternativas | None = None
    canais: OpcoesCanais | None = None
    pico: StrictBool = False

    def parametros_alternativas(self) -> ParametrosAlternativas | None:
        if self.alternativas is None:
            return None
        return ParametrosAlternativas(base=self.base, promocional=self.promocional, **self.alternativas.model_dump())

    def parametros_canais(self) -> ParametrosCanais | None:
        if self.canais is None:
            return None
        return ParametrosCanais(base=self.base, promocional=self.promocional, **self.canais.model_dump())

    @model_validator(mode="after")
    def validar_comparacoes(self) -> "CenarioSalvo":
        self.parametros_alternativas()
        self.parametros_canais()
        return self


def reabrir_cenario(arquivo: CenarioSalvo) -> dict:
    alternativas = arquivo.parametros_alternativas()
    canais = arquivo.parametros_canais()
    return {
        "arquivo": arquivo.model_dump(),
        "campos": campos_para_interface(),
        "promocao": analisar_promocao(arquivo),
        "ficha": calcular_ficha_tecnica(arquivo.ficha) if arquivo.ficha else None,
        "alternativas": comparar_alternativas(alternativas) if alternativas else None,
        "canais": comparar_canais(canais) if canais else None,
        "pico": comparar_pico(arquivo.promocional) if arquivo.pico else None,
    }
