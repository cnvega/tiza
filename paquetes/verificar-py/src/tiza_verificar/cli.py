"""`tiza-verificar archivo.tiza` → JSON con un estado por paso."""

from __future__ import annotations

import argparse
import json
import sys
import warnings

from .guion import ErrorGuion
from .verificar import verificar_guion


def principal(argv: list[str] | None = None) -> int:
    warnings.simplefilter("ignore")
    ap = argparse.ArgumentParser(
        prog="tiza-verificar",
        description="Compara cada paso de un guion .tiza con el anterior usando SymPy.",
    )
    ap.add_argument("archivos", nargs="+", help="guiones .tiza")
    ap.add_argument("--compacto", action="store_true", help="JSON en una línea")
    ap.add_argument(
        "--estricto",
        action="store_true",
        help="termina con código 1 si algún paso es no-equivalente",
    )
    args = ap.parse_args(argv)

    salida = []
    codigo = 0
    for ruta in args.archivos:
        try:
            resultado = verificar_guion(ruta)
        except (OSError, ErrorGuion) as e:
            print(f"tiza-verificar: {ruta}: {e}", file=sys.stderr)
            return 2
        salida.append(resultado)
        if args.estricto and any(p["estado"] == "no-equivalente" for p in resultado["pasos"]):
            codigo = 1

    datos = salida[0] if len(salida) == 1 else salida
    print(json.dumps(datos, ensure_ascii=False, indent=None if args.compacto else 2))
    return codigo
