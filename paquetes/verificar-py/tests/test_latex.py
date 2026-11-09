import pytest
import sympy as sp

from tiza_verificar.latex import Contexto, NoVerificable, expandir_macro, formula, preprocesar

CTX = Contexto(positivos={"r", "v_0"}, no_nulos={"a"}, macros=[])


def test_expande_id_anidado() -> None:
    s = preprocesar(r"\frac{\id{gm}{G M}}{\id{rr}{r}}")
    assert "id" not in s and "G M" in s


def test_expandir_macro_con_argumentos() -> None:
    assert expandir_macro(r"\par{x}{y} + 1", "par", 2, "(#1, #2)") == "(x, y) + 1"


def test_macros_del_encabezado() -> None:
    ctx = Contexto.desde_encabezado({"macros": "\\newcommand{\\doble}[1]{2 #1}\n"})
    f = formula(r"\doble{x} = 4", ctx)
    assert f.izq == 2 * sp.Symbol("x", real=True)


def test_supuestos_y_constantes() -> None:
    f = formula(r"\pi r^2 + v_0 = a", CTX)
    simbolos = {s.name: s for s in f.izq.free_symbols | f.der.free_symbols}  # type: ignore[union-attr]
    assert sp.pi in f.izq.atoms(sp.NumberSymbol)
    assert simbolos["r"].is_positive
    assert simbolos["v_{0}"].is_positive
    assert simbolos["a"].is_nonzero


def test_abs() -> None:
    f = formula(r"\abs{x} = 1", CTX)
    assert isinstance(f.izq, sp.Abs)


@pytest.mark.parametrize(
    "latex",
    [
        r"\comm{\hat{x}}{\hat{p}} = i\hbar",
        r"\acomm{A}{B} = 0",
        r"\expval{H} = E",
        r"\braket{\phi | \psi} = 1",
        r"\norm{\vec{v}} = 1",
        r"\tensor{T}{^\mu_\nu} = 0",
        r"g_{\mu\nu} = 0",
        r"\frac{\mathrm{d}v}{\mathrm{d}t} = a",
        r"\int_0^1 x = 1",
        r"x \approx 1",
        r"\text{hola} = 1",
        r"\frac{a}{b",
    ],
)
def test_no_verificable(latex: str) -> None:
    with pytest.raises(NoVerificable):
        formula(latex, CTX)
