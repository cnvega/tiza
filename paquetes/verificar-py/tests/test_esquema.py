"""Valida la salida contra el contrato C6 si el esquema ya está en el repositorio."""

import json
from pathlib import Path

import pytest

from tiza_verificar import verificar_guion

jsonschema = pytest.importorskip("jsonschema")


def test_salida_cumple_c6(corpus: Path) -> None:
    ruta = corpus.parent / "esquemas" / "verificacion.schema.json"
    if not ruta.exists():
        pytest.skip("esquemas/verificacion.schema.json aún no está fusionado (PR del contrato C6)")
    esquema = json.loads(ruta.read_text(encoding="utf-8"))
    for guion in sorted(corpus.rglob("*.tiza")):
        jsonschema.validate(verificar_guion(guion), esquema)
