# ADR 0003 — Contrato C6: estado de verificación por paso

- Estado: propuesto (lo aprueba Cris)
- Fecha: 2026-11-08
- Contrato: C6 (`esquemas/verificacion.schema.json`, versión `tiza-verificacion/0.1`)
- Issue: #8

## Contexto

El verificador CAS (W7, `paquetes/verificar-py`) compara cada paso de un guion con el anterior. Sus consumidores (el estudio, la exportación y el asistente LLM) necesitan un formato estable para mostrar el estado de cada paso, la condición de validez y, cuando falla, un punto donde los pasos difieren. El asistente usa ese punto para reintentar (hasta 3 veces, según la propuesta técnica).

## Decisión

1. **Un objeto por guion** con `version` (`tiza-verificacion/0.1`), `archivo`, `formato` y `pasos`.
2. **Un `EstadoVerificacion` por paso**, en el orden del guion, siempre con las mismas ocho claves (las que no aplican van en `null`):

   | Clave | Contenido |
   | --- | --- |
   | `id`, `linea` | Iguales que en C2 (`p1`…; línea del `##`), para cruzar con `PasoCompilado` |
   | `estado` | `verificado`, `probable`, `condicional`, `no-equivalente`, `no-verificable` (los cinco de la propuesta técnica) |
   | `metodo` | `premisa`, `sin-formula`, `lados`, `factor`, `sustitucion`, `simbolico`, `numerico`, `ninguno` |
   | `mensaje` | Explicación breve para el docente |
   | `factor` | LaTeX del factor k entre ecuaciones, si se calculó |
   | `condicion` | LaTeX de la condición; obligatoria si y solo si el estado es `condicional` |
   | `discrepancia` | `{punto, anterior, actual}`; solo con `no-equivalente`, y puede ser `null` si no se encontró un punto |

3. **El primer paso es `verificado` con método `premisa`**: no hay nada con qué compararlo y la interfaz no debe marcarlo como problema. Un paso sin fórmula es `verificado` con método `sin-formula`.
4. **`no-verificable` nunca es un error**: cubre notación fuera de alcance (operadores, Dirac, tensores, derivadas por ahora) y acciones pendientes (`aproximar`, `derivar`, `integrar`).
5. **Fórmulas en LaTeX** (`factor`, `condicion`) para que el estudio las componga con MathJax como el resto.
6. **Tres ejemplos** en `esquemas/ejemplos/verificacion-*.json`, generados con `tiza-verificar` desde `corpus/` (Kepler, despeje lineal y el guion con error sembrado de `corpus/bordes/`).

## Consecuencias

- El verificador TypeScript o Pyodide futuro (D6) debe producir este mismo formato.
- Agregar un método o una clave es un cambio de contrato (nuevo ADR y `tiza-verificacion/0.2`).
- `discrepancia.punto` usa los nombres de símbolo de SymPy (`v_{0}`), no los de LaTeX; si el estudio necesita resaltar símbolos en la fórmula, habrá que mapearlos (pendiente para F5).

## Alternativas descartadas

- **Estado del primer paso en `null`:** obliga a cada consumidor a tratar un caso especial.
- **Claves opcionales en vez de `null`:** más corto, pero cada consumidor tendría que distinguir «ausente» de «sin valor».
- **Expresiones en MathJSON (D3):** coherente con Compute Engine, pero el verificador trabaja en SymPy y hoy no hay conversor; LaTeX basta para mostrar.
