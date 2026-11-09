import pytest

from tiza_verificar.guion import ErrorGuion, analizar

TEXTO = """---
formato: tiza/0.2
titulo: Prueba
supuestos:
  positivos: [r]
---
<!-- comentario
de dos líneas -->
## Inicio
$$ a = b $$
:: recuadro
> Narración.

## Multilínea
:: pasar a der + resaltar b
$$
a - b
= 0
$$

## Sin fórmula
:: resaltar a

## Sustitución
:: sustituir v = \\frac{2 + r}{T}
$$ x = 1 $$
"""


def test_pasos_y_lineas() -> None:
    g = analizar(TEXTO)
    assert [p.id for p in g.pasos] == ["p1", "p2", "p3", "p4"]
    assert [p.linea for p in g.pasos] == [9, 14, 21, 24]
    assert g.encabezado["supuestos"]["positivos"] == ["r"]


def test_formulas_y_acciones() -> None:
    g = analizar(TEXTO)
    p1, p2, p3, p4 = g.pasos
    assert p1.latex == "a = b"
    assert [a.verbo for a in p1.posteriores] == ["recuadro"]
    assert "a - b" in (p2.latex or "") and "= 0" in (p2.latex or "")
    assert [a.verbo for a in p2.previas] == ["pasar", "resaltar"]
    assert p3.latex is None
    assert p4.previas[0].verbo == "sustituir"
    assert p4.previas[0].resto == "v = \\frac{2 + r}{T}"  # no se divide en « + »


def test_crlf() -> None:
    assert len(analizar(TEXTO.replace("\n", "\r\n")).pasos) == 4


@pytest.mark.parametrize(
    "texto",
    ["sin encabezado\n## a\n$$ x $$\n", "---\nformato: tiza/0.2\n", "---\ntitulo: t\n---\nnada\n"],
)
def test_errores(texto: str) -> None:
    with pytest.raises(ErrorGuion):
        analizar(texto)
