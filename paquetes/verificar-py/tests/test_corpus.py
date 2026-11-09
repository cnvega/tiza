import json
from pathlib import Path

import pytest

from tiza_verificar import verificar_guion
from tiza_verificar.cli import principal

ACEPTADOS = {"verificado", "probable"}


def test_todos_los_guiones_dan_un_resultado_por_paso(corpus: Path) -> None:
    guiones = sorted(corpus.rglob("*.tiza"))
    assert guiones
    for ruta in guiones:
        r = verificar_guion(ruta)
        assert r["pasos"], ruta
        for p in r["pasos"]:
            assert p["estado"] in {"verificado", "probable", "condicional", "no-equivalente", "no-verificable"}


@pytest.mark.parametrize(
    "nombre", ["astrofisica/01-kepler-tercera-ley.tiza", "algebra/01-despeje-lineal.tiza"]
)
def test_kepler_y_despeje_verificados(corpus: Path, nombre: str) -> None:
    r = verificar_guion(corpus / nombre)
    assert [p["estado"] for p in r["pasos"] if p["estado"] not in ACEPTADOS] == []


def test_error_sembrado(corpus: Path) -> None:
    r = verificar_guion(corpus / "bordes/01-paso-no-equivalente.tiza")
    estados = {p["id"]: p["estado"] for p in r["pasos"]}
    assert estados["p2"] == "no-equivalente"
    assert all(e in ACEPTADOS for i, e in estados.items() if i != "p2")


def test_cli(corpus: Path, capsys: pytest.CaptureFixture[str]) -> None:
    ruta = str(corpus / "bordes/01-paso-no-equivalente.tiza")
    assert principal([ruta]) == 0
    datos = json.loads(capsys.readouterr().out)
    assert datos["version"] == "tiza-verificacion/0.1"
    assert principal(["--estricto", "--compacto", ruta]) == 1
    capsys.readouterr()
    assert principal(["no-existe.tiza"]) == 2
