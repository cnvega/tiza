# verificar-py — verificador CAS de guiones `.tiza` (W7)

Compara cada paso de un guion con el anterior usando SymPy y le asigna uno de cinco estados. Es la primera versión de D6 («CLI primero, Pyodide después»): corre en Python 3.12+, sin depender de los paquetes TypeScript.

```sh
cd paquetes/verificar-py
pip install -e '.[pruebas]'
tiza-verificar ../../corpus/astrofisica/01-kepler-tercera-ley.tiza
python -m pytest
```

Opciones: `--compacto` (JSON en una línea), `--estricto` (código 1 si algún paso es `no-equivalente`). Código 2 si el archivo no se puede leer o no tiene encabezado ni pasos.

## Salida

Un objeto por guion con `version: "tiza-verificacion/0.1"`, `archivo`, `formato` y `pasos`. Cada paso trae siempre las mismas claves (borrador del contrato C6, `esquemas/verificacion.schema.json`, en su PR aparte):

| Clave | Contenido |
| --- | --- |
| `id`, `linea` | Como en C2: `p1`, `p2`…, y la línea del `##` |
| `estado` | `verificado`, `probable`, `condicional`, `no-equivalente`, `no-verificable` |
| `metodo` | `premisa`, `sin-formula`, `lados`, `factor`, `sustitucion`, `simbolico`, `numerico`, `ninguno` |
| `mensaje` | Explicación breve en español |
| `factor` | LaTeX del factor k entre ecuaciones, o `null` |
| `condicion` | LaTeX de la condición de validez (`r \neq 0`), solo si es `condicional` |
| `discrepancia` | `{punto, anterior, actual}`: un punto donde los pasos difieren, o `null` |

## Métodos

| Caso | Cómo se verifica |
| --- | --- |
| Primer paso | `premisa`: se acepta sin comparar |
| Paso sin fórmula | `sin-formula`: no cambia la matemática |
| Expresión → expresión | A − B se simplifica a 0 (`simbolico`); si no concluye en 2 s, se evalúa en 20 puntos al azar del dominio (`numerico` → `probable` o `no-equivalente`) |
| Ecuación → ecuación | Primero cada lado por separado (`lados`). Si no, se busca k con (L₂ − R₂) = k (L₁ − R₁) (`factor`). Cada factor de k que los `supuestos` no garantizan distinto de cero queda como condición (`condicional`); si esa condición anula todas las soluciones, el paso es `no-equivalente` |
| `:: sustituir a = b` | Se aplica al paso anterior y luego se compara (`sustitucion`) |
| `aproximar`, `derivar`, `integrar` | Si la comparación no concluye, `no-verificable` (pendiente) |

Supuestos: `positivos` → símbolo positivo, `no-nulos` → real distinto de cero, el resto real. `\pi`, `i` y `e` se leen como constantes, salvo que `i` o `e` estén declarados en `supuestos`.

## Capa de convenciones sobre `parse_latex`

- Expande las macros del encabezado, `\id{n}{x}` → `x` y `\abs{x}` → |x|.
- Usa el motor ANTLR de `parse_latex` y, si falla, el de Lark. El de Lark (experimental en SymPy 1.14) no reconoce `\pi`, `\left(` ni varias multiplicaciones implícitas; por eso no es el principal.
- Acepta solo comandos de una lista blanca. El motor ANTLR lee un comando desconocido como un símbolo (`\hat{x}` → hat·x), lo que daría resultados falsos.
- Quedan `no-verificable`, nunca error: conmutadores y operadores con `\hat` (pendiente: `sympy.physics.quantum`), notación de Dirac, `\expval`, vectores y normas, índices tensoriales (`\tensor`, índices griegos, ADR 0002), derivadas, integrales, sumas y límites, y relaciones distintas de `=`.

## Licencias (D12)

SymPy (BSD-3-Clause), antlr4-python3-runtime 4.11 (BSD-3-Clause), Lark (MIT), PyYAML (MIT); pytest (MIT) solo para pruebas.

## Límites conocidos

- Simplificar puede borrar restricciones de dominio: `y = (x²−1)/(x−1)` → `y = x + 1` queda `verificado`.
- La detección de condiciones que anulan todas las soluciones es heurística (por factores).
- El analizador del guion es mínimo y no valida el formato; lo reemplaza `paquetes/guion` (W1) cuando exista C2.
