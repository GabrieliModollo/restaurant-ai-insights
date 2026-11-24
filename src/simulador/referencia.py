"""Importa indicadores agregados no formato CSV de referência do projeto."""

import csv
import re
from datetime import date
from io import StringIO
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

CABECALHO = ("referenceDate", "orderCreationHour", "orderStatus", "count")
STATUS = {"CONCLUDED", "CANCELLED"}
LIMITE_CSV = 128 * 1024
LIMITE_REGISTROS = 1500


class ArquivoReferencia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    csv: Annotated[str, StringConstraints(min_length=1, max_length=LIMITE_CSV)]


def importar_referencia(conteudo: str) -> dict:
    """Agrupa contagens por hora e rejeita chaves que inflariam o total."""
    if len(conteudo.encode("utf-8")) > LIMITE_CSV:
        raise ValueError("Escolha um CSV de até 128 KB.")
    leitor = csv.reader(StringIO(conteudo.removeprefix("\ufeff"), newline=""), strict=True)
    try:
        cabecalho = next(leitor, [])
        if len(cabecalho) != len(CABECALHO) or set(cabecalho) != set(CABECALHO):
            raise ValueError("Use o cabeçalho do CSV de exemplo, com vírgulas.")
        grupos = set()
        por_hora = {}
        datas = set()
        for linha in leitor:
            if not linha:
                continue
            numero = leitor.line_num
            if len(grupos) >= LIMITE_REGISTROS:
                raise ValueError(f"Use até {LIMITE_REGISTROS} registros por arquivo.")
            if len(linha) != len(CABECALHO):
                raise ValueError(f"Linha {numero}: informe exatamente quatro colunas.")
            valores = dict(zip(cabecalho, (valor.strip() for valor in linha)))
            texto_data = valores["referenceDate"]
            try:
                if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", texto_data):
                    raise ValueError
                dia = date.fromisoformat(texto_data)
            except ValueError:
                raise ValueError(f"Linha {numero}: informe uma data válida no formato AAAA-MM-DD.") from None
            hora = valores["orderCreationHour"]
            if not re.fullmatch(r"(?:[01]?[0-9]|2[0-3])", hora):
                raise ValueError(f"Linha {numero}: informe uma hora de 0 a 23.")
            status = valores["orderStatus"]
            if status not in STATUS:
                raise ValueError(f"Linha {numero}: o status deve ser CONCLUDED ou CANCELLED.")
            quantidade = valores["count"]
            if not re.fullmatch(r"[0-9]{1,7}", quantidade):
                raise ValueError(f"Linha {numero}: informe uma contagem inteira de até sete dígitos.")

            hora_numero = int(hora)
            grupo = dia, hora_numero, status
            if grupo in grupos:
                raise ValueError(f"Linha {numero}: data, hora e status repetidos.")
            grupos.add(grupo)
            datas.add(dia)
            totais = por_hora.setdefault(hora_numero, {"concluidos": 0, "cancelados": 0})
            chave = "concluidos" if status == "CONCLUDED" else "cancelados"
            totais[chave] += int(quantidade)
    except csv.Error:
        raise ValueError(f"Linha {leitor.line_num}: CSV malformado. Confira aspas e colunas.") from None

    if not grupos:
        raise ValueError("Inclua ao menos um registro abaixo do cabeçalho.")
    return {
        "inicio": min(datas).isoformat(),
        "fim": max(datas).isoformat(),
        "dias_com_dados": len(datas),
        "concluidos": sum(hora["concluidos"] for hora in por_hora.values()),
        "cancelados": sum(hora["cancelados"] for hora in por_hora.values()),
        "por_hora": [{"hora": hora, **por_hora[hora]} for hora in sorted(por_hora)],
    }
