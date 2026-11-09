"""Comparación de un paso con el anterior.

Métodos (sección «Verificación matemática con CAS» de la propuesta técnica):

- Reescritura de una expresión: A − B se simplifica a 0; si no concluye a
  tiempo, se evalúa en 20 puntos al azar dentro del dominio declarado.
- Ecuación a ecuación: se busca k ≠ 0 tal que (L₂ − R₂) = k (L₁ − R₁).
  Si k depende de una cantidad que puede anularse, el paso es condicional.
- Sustitución declarada (`:: sustituir a = b`): se aplica al paso anterior y
  luego se compara como ecuación a ecuación.
"""

from __future__ import annotations

import random
import signal
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from typing import Any, TypeVar

import sympy as sp

from .latex import Contexto, Formula, NoVerificable, sustitucion

ESTADOS = ("verificado", "probable", "condicional", "no-equivalente", "no-verificable")
PUNTOS_NUMERICOS = 20
TIEMPO_SIMBOLICO = 2.0  # segundos

T = TypeVar("T")


@dataclass
class Resultado:
    estado: str
    metodo: str
    mensaje: str
    factor: str | None = None
    condicion: str | None = None
    discrepancia: dict[str, Any] | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def como_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d.pop("extra")
        return d


class _Tiempo(Exception):
    pass


@contextmanager
def _limite(segundos: float) -> Iterator[None]:
    """Corta el cálculo simbólico tras `segundos` (solo en el hilo principal de Unix)."""
    usable = hasattr(signal, "setitimer") and threading.current_thread() is threading.main_thread()
    if not usable:
        yield
        return

    def alarma(_s: int, _f: object) -> None:
        raise _Tiempo()

    anterior = signal.signal(signal.SIGALRM, alarma)
    signal.setitimer(signal.ITIMER_REAL, segundos)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, anterior)


def _con_limite(f: Callable[[], T], segundos: float = TIEMPO_SIMBOLICO) -> T | None:
    try:
        with _limite(segundos):
            return f()
    except _Tiempo:
        return None
    except Exception:
        return None


def _es_cero(e: sp.Expr) -> bool | None:
    """True si e ≡ 0, False si se demuestra que no, None si no concluye."""

    def calc() -> bool | None:
        s = sp.simplify(sp.expand(e))
        if s == 0:
            return True
        if s.is_zero is False and not s.free_symbols:
            return False
        return None

    return _con_limite(calc)


def _no_nulo(g: sp.Expr) -> bool:
    """¿Se demuestra con los supuestos que g ≠ 0 (y finito)?"""
    if g.is_zero is False and g.is_finite is not False:
        return True
    if g.is_positive or g.is_negative:
        return True
    return False


def _latex(e: sp.Expr) -> str:
    return sp.latex(e)


# --- evaluación numérica --------------------------------------------------


def _valor_al_azar(s: sp.Symbol, rng: random.Random) -> sp.Float:
    if s.is_positive:
        return sp.Float(rng.uniform(0.3, 3.0))
    v = rng.uniform(0.3, 3.0)
    return sp.Float(v if rng.random() < 0.5 else -v)


def _puntos(simbolos: list[sp.Symbol], semilla: int = 7) -> Iterator[dict[sp.Symbol, sp.Float]]:
    rng = random.Random(semilla)
    for _ in range(PUNTOS_NUMERICOS):
        yield {s: _valor_al_azar(s, rng) for s in simbolos}


def _numero(e: sp.Expr, punto: dict[sp.Symbol, sp.Float]) -> complex | None:
    try:
        v = complex(e.evalf(subs=punto))
    except (TypeError, ValueError):
        return None
    if v != v or abs(v) == float("inf"):  # NaN o infinito
        return None
    return v


def _cerca(a: complex, b: complex) -> bool:
    return abs(a - b) <= 1e-8 * max(1.0, abs(a), abs(b))


def _punto_legible(punto: dict[sp.Symbol, sp.Float]) -> dict[str, float]:
    return {s.name: round(float(v), 6) for s, v in sorted(punto.items(), key=lambda kv: kv[0].name)}


def _real(v: complex) -> float | dict[str, float]:
    if abs(v.imag) < 1e-12:
        return round(v.real, 9)
    return {"re": round(v.real, 9), "im": round(v.imag, 9)}


def _numerico_expresiones(a: sp.Expr, b: sp.Expr) -> Resultado:
    """Compara a y b en 20 puntos. probable / no-equivalente / no-verificable."""
    simbolos = sorted(a.free_symbols | b.free_symbols, key=lambda s: s.name)
    validos = 0
    for p in _puntos(simbolos):  # type: ignore[arg-type]
        va, vb = _numero(a, p), _numero(b, p)
        if va is None or vb is None:
            continue
        validos += 1
        if not _cerca(va, vb):
            return Resultado(
                "no-equivalente",
                "numerico",
                "Las expresiones difieren en un punto del dominio.",
                discrepancia={"punto": _punto_legible(p), "anterior": _real(va), "actual": _real(vb)},
            )
    if validos == 0:
        return Resultado("no-verificable", "ninguno", "No se pudo evaluar numéricamente.")
    return Resultado(
        "probable",
        "numerico",
        f"Coinciden en {validos} puntos al azar del dominio, sin demostración simbólica.",
    )


# --- expresiones ------------------------------------------------------------


def comparar_expresiones(a: sp.Expr, b: sp.Expr) -> Resultado:
    cero = _es_cero(a - b)
    if cero:
        return Resultado("verificado", "simbolico", "A − B se simplifica a 0.")
    return _numerico_expresiones(a, b)


# --- ecuaciones -------------------------------------------------------------


def _factores(e: sp.Expr, ext: list[sp.Expr] | None = None) -> list[sp.Expr]:
    """Factores no constantes de e (numerador o denominador ya separado)."""
    try:
        _c, lista = sp.factor_list(e, extension=ext) if ext else sp.factor_list(e)
    except Exception:
        return [e] if e.free_symbols else []
    return [f for f, _m in lista if f.free_symbols]


def _sin_radicales(
    *es: sp.Expr,
) -> tuple[list[sp.Expr], dict[sp.Symbol, sp.Expr], list[sp.Expr]]:
    """Quita raíces de símbolos positivos (s → t^q) para que `cancel` y `factor` funcionen.

    Devuelve las expresiones transformadas, el mapa de vuelta t → s^(1/q) y la
    lista de números algebraicos (√2…) para usar como extensión al factorizar.
    """
    denominadores: dict[sp.Symbol, int] = {}
    ext: set[sp.Expr] = set()
    for e in es:
        for pot in e.atoms(sp.Pow):
            if not (pot.exp.is_Rational and not pot.exp.is_Integer):
                continue
            q = int(pot.exp.q)
            if pot.base.is_Rational:
                ext.add(sp.Pow(pot.base, sp.Rational(1, q)))
                continue
            for s in pot.base.free_symbols:
                if s.is_positive:
                    assert isinstance(s, sp.Symbol)
                    denominadores[s] = sp.ilcm(denominadores.get(s, 1), q)
    ida: dict[sp.Symbol, sp.Expr] = {}
    vuelta: dict[sp.Symbol, sp.Expr] = {}
    for s, q in denominadores.items():
        t = sp.Symbol(f"{s.name}__r", positive=True)
        ida[s] = t**q
        vuelta[t] = s ** sp.Rational(1, q)
    salida = [sp.expand_power_base(sp.powsimp(e.xreplace(ida), force=True), force=True) for e in es]
    salida = [sp.simplify(e) if ida else e for e in salida]
    return salida, vuelta, sorted(ext, key=sp.default_sort_key)


def _contenido_en(ceros_de: sp.Expr, g: sp.Expr, ext: list[sp.Expr] | None = None) -> bool:
    """¿Todos los ceros de `ceros_de` son ceros de g? (heurística por factores)."""
    num, _ = sp.fraction(sp.together(ceros_de))
    criticos = [f for f in _factores(num, ext) if not _no_nulo(f)]
    if not criticos:
        return False
    fs = set(_factores(g, ext))
    return all(any(sp.simplify(f - h) == 0 or sp.simplify(f + h) == 0 for h in fs) for f in criticos)


def _punto_en_solucion(f1: sp.Expr, f2: sp.Expr) -> dict[str, Any] | None:
    """Busca un punto que cumple la ecuación anterior y no la actual."""
    simbolos = sorted(f1.free_symbols | f2.free_symbols, key=lambda s: s.name)
    if not f1.free_symbols:
        return None
    rng = random.Random(11)
    for objetivo in sorted(f1.free_symbols, key=lambda s: s.name):
        for _ in range(5):
            punto = {s: _valor_al_azar(s, rng) for s in simbolos if s != objetivo}  # type: ignore[arg-type]
            g = f1.subs(punto)
            sols = _con_limite(lambda: sp.solve(g, objetivo))
            if not sols:
                continue
            for sol in sols:
                v = _numero(sp.sympify(sol), {})
                if v is None or abs(v.imag) > 1e-9:
                    continue
                if objetivo.is_positive and v.real <= 0:
                    continue
                p = dict(punto)
                p[objetivo] = sp.Float(v.real)  # type: ignore[index]
                r2 = _numero(f2, p)  # type: ignore[arg-type]
                if r2 is not None and not _cerca(r2, 0):
                    return {"punto": _punto_legible(p), "anterior": 0.0, "actual": _real(r2)}  # type: ignore[arg-type]
    return None


def comparar_ecuaciones(e1: Formula, e2: Formula, metodo: str = "factor") -> Resultado:
    assert e1.der is not None and e2.der is not None
    # 1. Cada lado reescrito por separado (k = 1).
    m_lados = "lados" if metodo == "factor" else metodo
    if _es_cero(e1.izq - e2.izq) and _es_cero(e1.der - e2.der):
        return Resultado("verificado", m_lados, "Cada lado se reescribe de forma equivalente.")
    if _es_cero(e1.izq - e2.der) and _es_cero(e1.der - e2.izq):
        return Resultado("verificado", m_lados, "Se intercambian los lados.")

    f1 = e1.izq - e1.der
    f2 = e2.izq - e2.der
    z1, z2 = _es_cero(f1), _es_cero(f2)
    if z1 and z2:
        return Resultado("verificado", metodo, "Ambas ecuaciones son identidades.")
    if z1 or z2:
        return Resultado(
            "no-equivalente",
            metodo,
            "Una ecuación es una identidad y la otra no.",
            discrepancia=_punto_en_solucion(f1, f2) if z2 else None,
        )

    # 2. Factor k con (L₂ − R₂) = k (L₁ − R₁).
    preparado = _con_limite(lambda: _sin_radicales(f1, f2), 2 * TIEMPO_SIMBOLICO)
    if preparado is None:
        return _numerico_ecuaciones(f1, f2, metodo)
    (g1, g2), vuelta, ext = preparado

    def calcular_k() -> sp.Expr:
        c = sp.cancel(sp.together(sp.simplify(g2 / g1)), extension=ext) if ext else sp.cancel(sp.together(sp.simplify(g2 / g1)))
        return sp.factor(c, extension=ext) if ext else sp.factor(c)

    k = _con_limite(calcular_k, 2 * TIEMPO_SIMBOLICO)
    if k is None:
        return _numerico_ecuaciones(f1, f2, metodo)
    if k == 0 or k.is_zero:
        return Resultado("no-equivalente", metodo, "El factor entre ecuaciones es 0.")

    num, den = sp.fraction(sp.together(k))
    condiciones: list[sp.Expr] = []
    for g in _factores(num, ext):
        if _no_nulo(g):
            continue
        if _contenido_en(g2, g, ext):
            return _no_equivalente(f1, f2, metodo, k)
        condiciones.append(g.xreplace(vuelta))
    for g in _factores(den, ext):
        if _no_nulo(g):
            continue
        if _contenido_en(g1, g, ext):
            return _no_equivalente(f1, f2, metodo, k)
        condiciones.append(g.xreplace(vuelta))
    k = sp.simplify(k.xreplace(vuelta)) if vuelta else k

    if not k.free_symbols:
        # k constante: debe ser un número distinto de cero.
        if _numero(k, {}) is None:
            return Resultado("no-verificable", metodo, "El factor entre ecuaciones no es un número.")
        return Resultado("verificado", metodo, "Ecuación multiplicada por una constante distinta de cero.", factor=_latex(k))

    if not condiciones:
        return Resultado(
            "verificado",
            metodo,
            "El factor entre ecuaciones no se anula con los supuestos declarados.",
            factor=_latex(k),
        )
    cond = r" \land ".join(f"{_latex(g)} \\neq 0" for g in condiciones)
    return Resultado(
        "condicional",
        metodo,
        "Válido si no se anula lo que se multiplica o divide.",
        factor=_latex(k),
        condicion=cond,
    )


def _no_equivalente(f1: sp.Expr, f2: sp.Expr, metodo: str, k: sp.Expr | None) -> Resultado:
    return Resultado(
        "no-equivalente",
        metodo,
        "Las ecuaciones no tienen las mismas soluciones.",
        factor=None,
        discrepancia=_punto_en_solucion(f1, f2) or _punto_en_solucion(f2, f1),
    )


def _numerico_ecuaciones(f1: sp.Expr, f2: sp.Expr, metodo: str) -> Resultado:
    """Respaldo: el cociente f2/f1 constante en 20 puntos → probable."""
    simbolos = sorted(f1.free_symbols | f2.free_symbols, key=lambda s: s.name)
    cocientes = []
    for p in _puntos(simbolos):  # type: ignore[arg-type]
        a, b = _numero(f1, p), _numero(f2, p)
        if a is None or b is None or _cerca(a, 0):
            continue
        cocientes.append(b / a)
    if len(cocientes) >= 2 and all(_cerca(c, cocientes[0]) for c in cocientes) and not _cerca(cocientes[0], 0):
        return Resultado(
            "probable",
            "numerico",
            f"El cociente entre ecuaciones es constante en {len(cocientes)} puntos, sin demostración simbólica.",
        )
    return Resultado("no-verificable", "ninguno", "El cálculo simbólico no concluyó a tiempo.")


# --- paso -------------------------------------------------------------------

_SIN_VERIFICAR_AUN = {
    "aproximar": "aproximación declarada (pendiente)",
    "derivar": "derivada de ambos lados (pendiente)",
    "integrar": "integral de ambos lados (pendiente)",
}


def comparar_pasos(
    anterior: Formula, actual: Formula, previas: list[tuple[str, str]], ctx: Contexto
) -> Resultado:
    """Compara la fórmula `actual` con la `anterior`, dadas las acciones previas (verbo, resto)."""
    if anterior.es_ecuacion != actual.es_ecuacion:
        return Resultado("no-verificable", "ninguno", "Se pasa de expresión a ecuación (o al revés).")

    metodo = "factor"
    for verbo, resto in previas:
        if verbo == "sustituir":
            try:
                viejo, nuevo = sustitucion(resto, ctx)
            except NoVerificable as e:
                return Resultado("no-verificable", "ninguno", f"Sustitución no analizable: {e}")
            anterior = Formula(
                izq=anterior.izq.subs(viejo, nuevo),
                der=None if anterior.der is None else anterior.der.subs(viejo, nuevo),
                relacion=anterior.relacion,
            )
            metodo = "sustitucion"

    if actual.es_ecuacion:
        r = comparar_ecuaciones(anterior, actual, metodo)
    else:
        r = comparar_expresiones(anterior.izq, actual.izq)
        if metodo == "sustitucion" and r.metodo == "simbolico":
            r.metodo = "sustitucion"

    if r.estado in ("no-equivalente", "no-verificable"):
        for verbo, _ in previas:
            if verbo in _SIN_VERIFICAR_AUN:
                return Resultado("no-verificable", "ninguno", _SIN_VERIFICAR_AUN[verbo])
    return r
