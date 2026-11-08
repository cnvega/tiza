import pytest

from tiza_verificar import verificar_texto

from conftest import guion


def estados(texto: str) -> list[str]:
    return [p["estado"] for p in verificar_texto(texto)["pasos"]]


def ultimo(texto: str) -> dict:
    return verificar_texto(texto)["pasos"][-1]


@pytest.mark.parametrize(
    ("anterior", "actual", "estado"),
    [
        ("3x + 5 = 20", "3x = 15", "verificado"),
        ("x = 1", "x = 2", "no-equivalente"),
        ("(x+1) y = x + 1", "y = 1", "condicional"),
        ("x^2 = 4", "x = 2", "condicional"),
        ("y = \\frac{x^2 - 1}{x - 1}", "y = x + 1", "verificado"),
        ("(x+1)^2", "x^2 + 2x + 1", "verificado"),
        ("(x+1)^2", "x^2 + x + 1", "no-equivalente"),
        ("\\sin^2 x + \\cos^2 x", "1", "verificado"),
        ("x = 1", "x + 1", "no-verificable"),
    ],
)
def test_estados(anterior: str, actual: str, estado: str) -> None:
    assert ultimo(guion(anterior, actual))["estado"] == estado


def test_supuestos_quitan_la_condicion() -> None:
    sin = ultimo(guion("a x = a b", "x = b"))
    con = ultimo(guion("a x = a b", "x = b", supuestos="supuestos:\n  no-nulos: [a]\n"))
    assert sin["estado"] == "condicional" and sin["condicion"] == "a \\neq 0"
    assert con["estado"] == "verificado" and con["factor"] == "\\frac{1}{a}"


def test_discrepancia_en_ecuaciones() -> None:
    p = ultimo(guion("2x + 4 = 10", "2x = 10 + 4"))
    assert p["estado"] == "no-equivalente"
    assert p["discrepancia"]["punto"] == {"x": 3.0}
    assert p["discrepancia"]["actual"] != 0


def test_sustitucion_declarada() -> None:
    t = guion("E = m v^2", "E = m a^2 t^2", acciones={1: "sustituir v = a t"})
    p = ultimo(t)
    assert p["estado"] == "verificado" and p["metodo"] == "sustitucion"
    # Sin la acción, el paso no es equivalente.
    assert ultimo(guion("E = m v^2", "E = m a^2 t^2"))["estado"] == "no-equivalente"


def test_raiz_con_positivos() -> None:
    sup = "supuestos:\n  positivos: [g, h, v]\n"
    assert ultimo(guion("2 g h = v^2", "v = \\sqrt{2 g h}", supuestos=sup))["estado"] == "verificado"
    assert ultimo(guion("2 g h = v^2", "v = \\sqrt{2 g h}"))["estado"] != "verificado"


def test_accion_pendiente_no_es_error() -> None:
    t = guion("y = x^2", "y = 2x", acciones={1: "derivar x"})
    assert ultimo(t)["estado"] == "no-verificable"


def test_paso_sin_formula_y_no_analizable() -> None:
    texto = guion("x = 1", "\\comm{A}{B} = 0", "x = 1") + "## \n:: resaltar x\n"
    assert estados(texto) == ["verificado", "no-verificable", "no-verificable", "verificado"]


def test_campos_completos() -> None:
    for p in verificar_texto(guion("x = 1", "x = 2"))["pasos"]:
        assert set(p) == {"id", "linea", "estado", "metodo", "mensaje", "factor", "condicion", "discrepancia"}
