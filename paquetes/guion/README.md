# @tiza/guion

Analizador y validador de guiones `.tiza` (contrato C1 → C2, frente W1). Lee `tiza/0.1` y `tiza/0.2` según `docs/spec/tiza-formato.md` y produce el `GuionCompilado` de `esquemas/paso-compilado.schema.json` (ADR 0003).

## Uso

```ts
import { analizar, compilar, preprocesar } from "@tiza/guion";

const { encabezado, pasos, diagnosticos, prueba } = analizar(texto);
const { guion } = compilar(texto); // GuionCompilado (C2), o null si hay errores

preprocesar("\\comm{\\hat{x}}{\\hat{p}} + \\tensor{T}{^\\mu_\\nu}");
// → "\\left[ \\hat{x}, \\hat{p} \\right] + {T}^{\\mu}{}_{\\nu}"
```

Cada diagnóstico trae `codigo`, `nivel` (`error` | `advertencia`), `mensaje`, `linea` y `columna` (desde 1), ordenados por posición. `analizar` nunca lanza excepciones por el contenido del guion.

## CLI

```sh
node paquetes/guion/src/cli.ts validar corpus/fisica/01-caida-desde-reposo.tiza
node paquetes/guion/src/cli.ts validar --json corpus/
pnpm corpus   # validar --esperado corpus/ (lo corre el CI)
```

- Las carpetas se recorren buscando `.tiza`.
- Sale con código 1 si algún guion tiene errores; con `--esperado`, si alguno no cumple el `esperado` de su bloque `prueba`: `ok` = sin errores, `advertencia:Wnn` = sin errores y con Wnn, `error:Enn` = con Enn.
- Usa la eliminación de tipos de Node 22 (sin compilar).

## Validaciones

| Código | Qué revisa aquí |
| --- | --- |
| E01–E04 | Encabezado, `formato`, `titulo`, pasos y fórmula del primer paso |
| E06 | Más de una fórmula en un paso |
| E07 | `\begin`, `\\`, `&`, `\color`, `\label`, `\tag`, `\text{}` con LaTeX; también fórmula sin `$$` de cierre |
| E08 | Verbo desconocido, firma de la sección 7, forma de las referencias (`r#0` no vale) y posición (`recuadro` antes de la fórmula, `pasar` después, transformaciones en un paso sin fórmula) |
| E11 | `\id` con nombre inválido, repetido o sin expresión |
| E12 | Transformación antes de la fórmula del primer paso |
| E13 | `\left`/`\right` sin pareja y `\middle` fuera de un par |
| W00 | Línea fuera de la gramática (no es `##`, `::`, `$$` ni `>`); viene del prototipo y no está en la sección 8 |
| W01 | Clave desconocida (no `prueba`), paquete desconocido o valor no válido (se usa el valor por omisión) |
| W02 | Verbo de la v1.0 (columna «Entrega» de la sección 7); configurable con `implementados` |
| W03 | Más de 60 glifos, **estimados** desde el LaTeX; la cuenta exacta será de `tipografia` |
| W04 | Más de 12 pasos |
| W05 | Símbolos de la fórmula que no están en `supuestos` (heurística: sin scripts, texto recto, `\pi` ni diferenciales) |
| W08 | `paquetes: [physics]` |

Fuera de este paquete: E05, E09 y E10 (necesitan componer el LaTeX, W3) y W06–W07 (v1.0).

## Macros de Tiza (ADR 0002)

`expandirTensor`, `expandirMacrosTiza` (`\comm`, `\acomm`, `\expval`, `\abs`, `\norm`), `quitarIds` y `preprocesar(tex, { physics, quitarIds })`. Con `physics`, las macros de delimitadores no se expanden porque las define ese paquete.

## Desarrollo

```sh
pnpm --filter @tiza/guion test    # Vitest con cobertura (umbral 80 %)
pnpm --filter @tiza/guion tipos
```

Las pruebas validan todo `corpus/` contra su `esperado`, la salida contra el esquema C2 (Ajv, JSON Schema 2020-12), los ejemplos de `esquemas/ejemplos/paso-compilado/` y los ejemplos 10.1–10.4 de la especificación.
