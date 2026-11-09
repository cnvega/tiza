"""De LaTeX de un paso a expresiones de SymPy.

Capa propia de convenciones sobre `sympy.parsing.latex.parse_latex`:

1. Expande macros del encabezado (`macros:`) y `\\id{n}{x}` → `x`.
2. Expande `\\abs{x}`; marca como no verificables las notaciones que el CAS
   aún no cubre (operadores no conmutativos, Dirac, normas, tensores,
   derivadas), en vez de dejar que el analizador las lea mal.
3. Acepta solo comandos de una lista blanca: el analizador ANTLR de SymPy lee
   un comando desconocido como símbolo (`\\hat{x}` → hat·x), y eso daría
   resultados falsos.
4. Asigna los supuestos del encabezado a los símbolos.

Todo lo que no se pueda analizar levanta `NoVerificable`, nunca otro error.
"""

from __future__ import annotations

import re
import warnings
from dataclasses import dataclass
from typing import Any

import sympy as sp


class NoVerificable(Exception):
    """La notación queda fuera del alcance del verificador."""


@dataclass
class Formula:
    """Una fórmula de paso: ecuación (izq = der) o expresión (solo izq)."""

    izq: sp.Expr
    der: sp.Expr | None
    relacion: str | None  # "=" o None

    @property
    def es_ecuacion(self) -> bool:
        return self.relacion == "="


# --- utilidades de llaves -------------------------------------------------


def _argumento(s: str, i: int) -> tuple[str, int]:
    """Lee un argumento de macro desde s[i] (salta espacios). Devuelve (texto, fin)."""
    while i < len(s) and s[i] in " \t\n":
        i += 1
    if i >= len(s):
        raise NoVerificable("macro sin argumento")
    if s[i] != "{":
        if s[i] == "\\":
            m = re.match(r"\\[A-Za-z]+", s[i:])
            if m:
                return m.group(0), i + m.end()
        return s[i], i + 1
    nivel = 0
    for j in range(i, len(s)):
        if s[j] == "{" and (j == 0 or s[j - 1] != "\\"):
            nivel += 1
        elif s[j] == "}" and s[j - 1] != "\\":
            nivel -= 1
            if nivel == 0:
                return s[i + 1 : j], j + 1
    raise NoVerificable("llaves sin cerrar")


def expandir_macro(s: str, nombre: str, nargs: int, plantilla: str) -> str:
    """Reemplaza cada `\\nombre{a1}…{an}` por la plantilla con #1…#n."""
    patron = re.compile(r"\\" + re.escape(nombre) + r"(?![A-Za-z])")
    for _ in range(200):  # límite contra macros recursivas
        m = patron.search(s)
        if not m:
            return s
        fin = m.end()
        args = []
        for _ in range(nargs):
            a, fin = _argumento(s, fin)
            args.append(a)
        cuerpo = plantilla
        for k, a in enumerate(args, start=1):
            cuerpo = cuerpo.replace(f"#{k}", a)
        s = s[: m.start()] + cuerpo + s[fin:]
    raise NoVerificable(f"expansión de \\{nombre} demasiado profunda")


def macros_del_encabezado(texto: str | None) -> list[tuple[str, int, str]]:
    """Lee `\\newcommand{\\x}[n]{cuerpo}` (y `\\renewcommand`) del bloque `macros`."""
    if not texto:
        return []
    salida = []
    for m in re.finditer(r"\\(?:re)?newcommand\s*\{?\\([A-Za-z]+)\}?\s*(?:\[(\d)\])?", texto):
        try:
            cuerpo, _ = _argumento(texto, m.end())
        except NoVerificable:
            continue
        salida.append((m.group(1), int(m.group(2) or 0), cuerpo))
    return salida


# --- preproceso ----------------------------------------------------------

# Notaciones que el CAS aún no cubre: (patrón, motivo).
_FUERA_DE_ALCANCE = [
    (r"\\(comm|acomm)\b", "conmutadores de operadores (pendiente: sympy.physics.quantum)"),
    (r"\\hat\b", "operadores no conmutativos (pendiente: sympy.physics.quantum)"),
    (r"\\(expval|bra|ket|braket|Bra|Ket|Braket|langle|rangle)\b", "notación de Dirac y valores esperados"),
    (r"\\(norm|lVert|rVert|vec|mathbf|boldsymbol)\b|\\\||\\left\\\|", "vectores y normas"),
    (r"\\tensor\b|\{\}\s*[_^]", "índices tensoriales abstractos"),
    (r"[_^]\s*\{?\s*\\(mu|nu|lambda|sigma|rho|kappa)\b", "índices tensoriales abstractos"),
    (r"\\(partial|nabla|dot|ddot)\b|\\mathrm\s*\{\s*d\s*\}|\\frac\s*\{\s*d", "derivadas (pendiente)"),
    (r"\\(int|iint|oint|sum|prod|lim)\b", "integrales, sumas y límites (pendiente)"),
    (r"\\(approx|propto|sim|le|ge|leq|geq|neq|lt|gt)\b|<|>", "relaciones distintas de ="),
    (r"\\begin\b|\\\\|&", "construcción no admitida"),
]

_PERMITIDOS = {
    "frac", "sqrt", "cdot", "times", "left", "right", "pi", "hbar", "mathit",
    "sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh", "ln", "log", "exp", "infty", "pm",
    # griegas (excepto pi, que tiene trato aparte)
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta",
    "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "rho",
    "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega",
}


def preprocesar(latex: str, macros: list[tuple[str, int, str]] | None = None) -> str:
    s = latex.replace("\n", " ")
    for nombre, n, cuerpo in macros or []:
        s = expandir_macro(s, nombre, n, cuerpo)
    s = expandir_macro(s, "id", 2, "{#2}")
    s = expandir_macro(s, "abs", 1, r"|{#1}|")
    for patron, motivo in _FUERA_DE_ALCANCE:
        if re.search(patron, s):
            raise NoVerificable(motivo)
    s = re.sub(r"\\[dt]frac(?![A-Za-z])", r"\\frac", s)
    s = re.sub(r"\\[,;:!]|\\quad\b|\\qquad\b|~", " ", s)
    s = re.sub(r"\\(big|Big|bigg|Bigg)[lr]?(?![A-Za-z])", "", s)
    s = re.sub(r"\\left\s*\[", "(", s)
    s = re.sub(r"\\right\s*\]", ")", s)
    s = re.sub(r"\\left\s*\(", "(", s)
    s = re.sub(r"\\right\s*\)", ")", s)
    s = re.sub(r"\\left\s*\|", "|", s)
    s = re.sub(r"\\right\s*\|", "|", s)
    s = re.sub(r"\\mathrm\s*\{\s*([A-Za-z])\s*\}", r"\1", s)
    for cmd in re.findall(r"\\([A-Za-z]+)", s):
        if cmd not in _PERMITIDOS:
            raise NoVerificable(f"comando \\{cmd} fuera del alcance del analizador")
    return s


# --- análisis -------------------------------------------------------------


def _parse(texto: str) -> sp.Expr:
    from sympy.parsing.latex import parse_latex

    if not texto.strip():
        raise NoVerificable("lado vacío")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            e = parse_latex(texto)  # motor ANTLR (más completo)
        except Exception:
            try:
                e = parse_latex(texto, backend="lark")
            except Exception as ex:
                raise NoVerificable(f"LaTeX que el analizador no entiende: {texto.strip()}") from ex
    if not isinstance(e, sp.Expr):
        raise NoVerificable("la fórmula no es una expresión algebraica")
    return e


def _dividir_relacion(s: str) -> tuple[str, str | None]:
    """Divide en el `=` de nivel cero. Más de uno → no verificable."""
    nivel = 0
    posiciones = []
    for i, c in enumerate(s):
        if c in "{(":
            nivel += 1
        elif c in "})":
            nivel -= 1
        elif c == "=" and nivel == 0:
            posiciones.append(i)
    if not posiciones:
        return s, None
    if len(posiciones) > 1:
        raise NoVerificable("más de una relación en la fórmula")
    i = posiciones[0]
    return s[:i], s[i + 1 :]


def normalizar_nombre(nombre: str) -> str:
    """`v_{0}`, `v_0` y `\\theta` → `v_0`, `v_0`, `theta`."""
    return re.sub(r"[\\{}\s]", "", nombre)


@dataclass
class Contexto:
    """Supuestos y macros de un guion."""

    positivos: set[str]
    no_nulos: set[str]
    macros: list[tuple[str, int, str]]

    @classmethod
    def desde_encabezado(cls, enc: dict[str, Any]) -> Contexto:
        sup = enc.get("supuestos") or {}

        def lista(clave: str) -> set[str]:
            v = sup.get(clave) or []
            return {normalizar_nombre(str(x)) for x in v} if isinstance(v, list) else set()

        return cls(
            positivos=lista("positivos"),
            no_nulos=lista("no-nulos"),
            macros=macros_del_encabezado(enc.get("macros")),
        )

    def simbolo(self, nombre: str) -> sp.Symbol:
        n = normalizar_nombre(nombre)
        if n in self.positivos or n == "hbar":
            return sp.Symbol(nombre, positive=True)
        if n in self.no_nulos:
            return sp.Symbol(nombre, real=True, nonzero=True)
        return sp.Symbol(nombre, real=True)

    def con_supuestos(self, e: sp.Expr) -> sp.Expr:
        reemplazos: dict[sp.Symbol, Any] = {}
        declarados = self.positivos | self.no_nulos
        for s in e.free_symbols:
            assert isinstance(s, sp.Symbol)
            n = normalizar_nombre(s.name)
            if n == "pi":
                reemplazos[s] = sp.pi
            elif n == "i" and n not in declarados:
                reemplazos[s] = sp.I
            elif n == "e" and n not in declarados:
                reemplazos[s] = sp.E
            else:
                reemplazos[s] = self.simbolo(s.name)
        return e.xreplace(reemplazos)


def formula(latex: str, ctx: Contexto) -> Formula:
    s = preprocesar(latex, ctx.macros)
    izq, der = _dividir_relacion(s)
    a = ctx.con_supuestos(_parse(izq))
    if der is None:
        return Formula(izq=a, der=None, relacion=None)
    b = ctx.con_supuestos(_parse(der))
    return Formula(izq=a, der=b, relacion="=")


def sustitucion(resto: str, ctx: Contexto) -> tuple[sp.Expr, sp.Expr]:
    """`v = \\frac{2\\pi r}{T}` → (v, 2πr/T)."""
    f = formula(resto, ctx)
    if not f.es_ecuacion or f.der is None:
        raise NoVerificable("sustitución sin =")
    return f.izq, f.der
