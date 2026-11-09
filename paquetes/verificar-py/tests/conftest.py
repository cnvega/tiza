import warnings
from pathlib import Path

import pytest

warnings.simplefilter("ignore")

RAIZ = Path(__file__).resolve().parents[3]
CORPUS = RAIZ / "corpus"


@pytest.fixture
def corpus() -> Path:
    return CORPUS


def guion(*formulas: str, supuestos: str = "", acciones: dict[int, str] | None = None) -> str:
    """Arma un guion mínimo con una fórmula por paso; `acciones` = {índice: línea ::}."""
    acciones = acciones or {}
    texto = "---\nformato: tiza/0.2\ntitulo: prueba\n" + supuestos + "---\n"
    for i, f in enumerate(formulas):
        texto += "## \n"
        if i in acciones:
            texto += f":: {acciones[i]}\n"
        texto += f"$$ {f} $$\n"
    return texto
