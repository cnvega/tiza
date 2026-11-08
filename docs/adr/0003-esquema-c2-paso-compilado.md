# ADR 0003 — Esquema del contrato C2 (`GuionCompilado` con `PasoCompilado[]`)

- Estado: propuesto (lo aprueba Cris)
- Fecha: 2026-11-08
- Contrato: C2 (`esquemas/paso-compilado.schema.json`, borrador inicial)
- Issue: #7

## Contexto

La sección 9 de la especificación resume el `PasoCompilado` con un ejemplo y remite al esquema completo, que no existía. W1 (`guion`) lo produce y W3 (`tipografia`), W7 (`verificar`) y W8 (`asistente`) lo consumen; ninguno puede empezar contra datos de prueba sin un esquema con ejemplos (coordinación, sección 4).

## Decisión

1. **JSON Schema 2020-12** en `esquemas/paso-compilado.schema.json`, con `additionalProperties: false` en todos los objetos: un campo nuevo exige cambiar el contrato.
2. **La raíz es un `GuionCompilado`**, no una lista suelta: el encabezado normalizado (con los valores por omisión de la sección 3 ya aplicados) y `pasos: PasoCompilado[]`. `tipografia` necesita `macros` y `paquetes`, y `verificar` necesita `supuestos`; repetirlos en cada paso sería redundante. `prueba` no se incluye (se ignora en producción) y las claves desconocidas tampoco (solo generan W01).
3. **`PasoCompilado`** conserva los campos de la sección 9 (`id`, `titulo`, `latex`, `modo`, `compases`, `narracion`, `linea`) y agrega `ids`:
   - `titulo` y `narracion` son siempre texto; vacío cuando no hay.
   - `latex` es la fórmula sin espacios al borde y con los saltos de línea cambiados por un espacio. Conserva `\id`, `\tensor` y las macros del autor: los expande `tipografia`. Es `null` si el paso no tiene fórmula.
   - `modo` ya viene resuelto desde `pizarra` y las acciones `en-lugar` / `nueva-linea`, que por eso no aparecen en `compases`. El primer paso siempre es `nueva-linea`.
   - `ids`: nombres de `\id{…}{…}` de la fórmula en orden de lectura, para que `emparejar` y la validación E11 no tengan que volver a analizar el LaTeX.
4. **`Compas`** = una línea `::`, con `acciones` (las unidas con ` + `), `posicion` (`previa` o `posterior`; por omisión `previa`, para que el ejemplo de la sección 9 siga valiendo) y `linea` opcional para los mensajes.
5. **Una forma por verbo.** Cada verbo de la sección 7 admite solo sus campos:

   | Campos | Verbos |
   | --- | --- |
   | `objetivos` (1) + `lado` | `pasar` |
   | `objetivos` (1 o más) | `cancelar`, `resaltar` |
   | `objetivos` (0 o más) | `borrar` |
   | `objetivos` (0 o 1) | `expandir`, `simplificar`, `recuadro` |
   | `objetivos` (1) | `bajar`, `subir`, `factorizar` |
   | `objetivos` (2) | `contraer`, `intercambiar`, `flecha` |
   | `objetivos` (1) + `texto` | `llave` |
   | `de`, `a`, `objetivos` (0 o 1) | `renombrar` |
   | `de`, `a` (lados del primer `=`) | `sustituir` |
   | `tex` (resto de la línea) | `ambos-lados` |
   | `variable` [+ `desde` y `hasta`, juntos] | `derivar`, `integrar` |
   | `texto` [+ `lado`, por omisión `der`] | `aproximar`, `nota` |
   | `segundos` | `pausa` |
   | — | `columna` |

6. **Las referencias van como las escribió el autor** (`ms`, `T^2`, `r#2`, `^\mu`; sin las llaves externas si venían entre llaves). Resolverlas contra glifos es trabajo de `emparejar` (C3 → C4); el analizador solo valida su forma.
7. **Ejemplos** en `esquemas/ejemplos/paso-compilado/`, hechos a mano desde los tres guiones de `corpus/`. Cuando exista el analizador de W1, se regeneran con él y el CI los valida contra el esquema.

## Alternativas descartadas

- **Lista suelta `PasoCompilado[]` como raíz** (nombre literal del contrato): obliga a repetir `macros` y `supuestos` por paso o a un segundo contrato para el encabezado.
- **Referencias ya estructuradas** (`{ tipo, tex, aparicion, posicion }`): adelanta a W1 decisiones de la gramática de referencias que aún se están probando en el prototipo. Se puede agregar en una versión siguiente sin perder información.
- **Acciones genéricas** (`verbo` + `argumentos: string[]`): más simple, pero deja la firma de cada verbo sin validar fuera del analizador.

## Consecuencias

- La sección 9 de la especificación queda como resumen; su ejemplo valida contra `$defs/PasoCompilado` si se le agrega `ids: []`. Ajustar ese ejemplo es un cambio de C1 y queda para el siguiente PR de especificación.
- W1, W3, W7 y W8 pueden trabajar contra los ejemplos desde ya.
- Cualquier campo nuevo (por ejemplo, diagnósticos o referencias estructuradas) requiere un ADR que modifique este.
