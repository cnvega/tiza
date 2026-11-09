"""Analizador mínimo de guiones `.tiza` (docs/spec/tiza-formato.md).

Solo extrae lo que el verificador necesita: encabezado, y por paso su línea,
fórmula y acciones. No valida el formato: eso es trabajo de `paquetes/guion`
(W1), que reemplazará este módulo cuando exista el contrato C2.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


class ErrorGuion(Exception):
    """El archivo no tiene la estructura mínima de un guion."""


@dataclass
class Accion:
    verbo: str
    resto: str  # argumentos sin analizar, tal como vienen en la línea


@dataclass
class Paso:
    id: str
    linea: int
    titulo: str
    latex: str | None
    previas: list[Accion] = field(default_factory=list)
    posteriores: list[Accion] = field(default_factory=list)


@dataclass
class Guion:
    encabezado: dict[str, Any]
    pasos: list[Paso]


_COMENTARIO = re.compile(r"<!--.*?-->", re.DOTALL)


def _quitar_comentarios(texto: str) -> str:
    # Conserva los saltos de línea para no mover los números de línea.
    return _COMENTARIO.sub(lambda m: "\n" * m.group(0).count("\n"), texto)


def _acciones(linea: str) -> list[Accion]:
    cuerpo = linea[2:].strip()
    salida = []
    # `sustituir` y `ambos-lados` toman el resto de la línea; no se dividen.
    partes = [cuerpo] if re.match(r"(sustituir|ambos-lados)\b", cuerpo) else cuerpo.split(" + ")
    for parte in partes:
        parte = parte.strip()
        if not parte:
            continue
        verbo, _, resto = parte.partition(" ")
        salida.append(Accion(verbo=verbo, resto=resto.strip()))
    return salida


def analizar(texto: str) -> Guion:
    texto = texto.replace("\r\n", "\n").lstrip("﻿")
    texto = _quitar_comentarios(texto)
    lineas = texto.split("\n")

    if not lineas or lineas[0].strip() != "---":
        raise ErrorGuion("falta el encabezado YAML")
    try:
        fin = next(i for i in range(1, len(lineas)) if lineas[i].strip() == "---")
    except StopIteration as e:
        raise ErrorGuion("el encabezado YAML no se cierra con ---") from e
    try:
        encabezado = yaml.safe_load("\n".join(lineas[1:fin])) or {}
    except yaml.YAMLError as e:
        raise ErrorGuion(f"encabezado YAML inválido: {e}") from e
    if not isinstance(encabezado, dict):
        raise ErrorGuion("el encabezado YAML no es un mapa")

    pasos: list[Paso] = []
    actual: Paso | None = None
    formula: list[str] | None = None  # líneas de una fórmula abierta

    for i in range(fin + 1, len(lineas)):
        linea = lineas[i]
        s = linea.strip()
        if formula is not None:
            if s.endswith("$$"):
                formula.append(s[:-2])
                assert actual is not None
                actual.latex = "\n".join(formula).strip()
                formula = None
            else:
                formula.append(linea)
            continue
        if s == "##" or s.startswith("## "):
            actual = Paso(id=f"p{len(pasos) + 1}", linea=i + 1, titulo=s[2:].strip(), latex=None)
            pasos.append(actual)
        elif actual is None:
            continue
        elif s.startswith("::"):
            destino = actual.previas if actual.latex is None else actual.posteriores
            destino.extend(_acciones(s))
        elif s.startswith("$$"):
            resto = s[2:]
            if resto.rstrip().endswith("$$") and resto.strip() != "":
                actual.latex = resto.rstrip()[:-2].strip()
            else:
                formula = [resto]
    if formula is not None:
        raise ErrorGuion("fórmula sin cerrar ($$)")
    if not pasos:
        raise ErrorGuion("el guion no tiene pasos")
    return Guion(encabezado=encabezado, pasos=pasos)


def leer(ruta: str | Path) -> Guion:
    return analizar(Path(ruta).read_text(encoding="utf-8"))
