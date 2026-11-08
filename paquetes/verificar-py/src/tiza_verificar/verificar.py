"""Verificación de un guion completo: un `EstadoVerificacion` por paso (C6)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .comparar import Resultado, comparar_pasos
from .guion import Guion, analizar, leer
from .latex import Contexto, Formula, NoVerificable, formula

VERSION_SALIDA = "tiza-verificacion/0.1"


def _paso(paso_id: str, linea: int, r: Resultado) -> dict[str, Any]:
    return {"id": paso_id, "linea": linea, **r.como_dict()}


def verificar(g: Guion, archivo: str | None = None) -> dict[str, Any]:
    ctx = Contexto.desde_encabezado(g.encabezado)
    pasos: list[dict[str, Any]] = []
    anterior: Formula | None = None
    anterior_error: str | None = None  # motivo si la fórmula anterior no se pudo analizar
    hubo_formula = False

    for p in g.pasos:
        if p.latex is None:
            r = Resultado("verificado", "sin-formula", "El paso no cambia la fórmula.")
            if not hubo_formula:
                r = Resultado("no-verificable", "ninguno", "Paso sin fórmula antes de la primera fórmula.")
            pasos.append(_paso(p.id, p.linea, r))
            continue

        try:
            actual: Formula | None = formula(p.latex, ctx)
            error = None
        except NoVerificable as e:
            actual, error = None, str(e)

        if not hubo_formula:
            if actual is None:
                r = Resultado("no-verificable", "ninguno", f"Premisa no analizable: {error}")
            else:
                r = Resultado("verificado", "premisa", "Punto de partida: se acepta sin comparar.")
        elif actual is None:
            r = Resultado("no-verificable", "ninguno", f"No analizable: {error}")
        elif anterior is None:
            r = Resultado("no-verificable", "ninguno", f"El paso anterior no es analizable: {anterior_error}")
        else:
            previas = [(a.verbo, a.resto) for a in p.previas]
            r = comparar_pasos(anterior, actual, previas, ctx)

        pasos.append(_paso(p.id, p.linea, r))
        hubo_formula = True
        anterior, anterior_error = actual, error

    return {
        "version": VERSION_SALIDA,
        "archivo": archivo,
        "formato": str(g.encabezado.get("formato", "")) or None,
        "pasos": pasos,
    }


def verificar_texto(texto: str, archivo: str | None = None) -> dict[str, Any]:
    return verificar(analizar(texto), archivo)


def verificar_guion(ruta: str | Path) -> dict[str, Any]:
    return verificar(leer(ruta), str(ruta))
