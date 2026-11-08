# Tiza — coordinación técnica para sesiones paralelas

Documento de arranque para cualquier sesión de Claude (chat o Claude Code) que trabaje en Tiza.
**Léelo completo antes de tocar código o especificaciones.** Mantén este archivo corto: el detalle vive en el repositorio.

- Propuesta técnica completa: https://claude.ai/artifact/Pr3v3RUE9W86fmLdge6yN3
- Formato de entrada: `tiza-formato-v0.1.md` (en este proyecto y en `docs/spec/` del repo)
- Repositorio GitHub: https://github.com/cnvega/tiza
- Responsable: Cris (decide alcance, aprueba PR y contratos).

---

## 1. Qué es Tiza, en cinco líneas

1. El docente escribe una derivación como guion `.tiza` (Markdown + LaTeX, un bloque por paso).
2. El núcleo compone cada paso con MathJax 4 en glifos SVG, empareja glifos entre pasos y planifica gestos en compases.
3. Un reloj virtual dibuja cada cuadro como función pura del tiempo (Canvas 2D con efecto tiza).
4. Salidas: presentación en vivo con clic, fuente para OBS, video exportado, visor HTML y apunte PDF.
5. Servicios laterales, fuera del núcleo: verificador CAS (SymPy) y asistente LLM (propone pasos; nada entra sin verificación y aprobación).

---

## 2. Decisiones fijadas (no cambiar sin ADR)

| # | Decisión |
| --- | --- |
| D1 | Monorepo TypeScript estricto con pnpm workspaces; Node 22 LTS |
| D2 | Tipografía: MathJax 4, TeX → SVG sin caché de fuentes (`fontCache: 'none'`) |
| D3 | Estructura matemática: Compute Engine (MathJSON); MathML de MathJax como respaldo |
| D4 | Dibujo: Canvas 2D; WebGL solo si la textura de tiza lo exige |
| D5 | Reloj virtual: `cuadro(t)` puro, sin estado acumulado entre cuadros |
| D6 | Verificación: SymPy (Python 3.12) — CLI primero, Pyodide en el navegador después |
| D7 | Video: WebCodecs + Mediabunny en navegador; ffmpeg en escritorio/CI |
| D8 | Interfaz: React + Vite; el núcleo no importa React |
| D9 | Pruebas: Vitest (unidad), Playwright con comparación de imágenes (visual), corpus `.tiza` |
| D10 | El LLM nunca produce animación: solo contenido en formato `.tiza` |
| D11 | El guion `.tiza` es la única fuente de verdad; las correcciones del inspector se guardan como `\id` |
| D12 | Licencias (ADR 0001): código AGPL-3.0-only con licencia comercial dual del titular; especificación y documentación CC BY 4.0; corpus CC BY-SA 4.0. Dependencias nuevas solo MIT, BSD, ISC, Apache-2.0 o MPL-2.0; no GPL, AGPL ni LGPL de terceros, ni licencias propietarias o que prohíban uso comercial. Contribuciones externas con CLA (`CLA.md`) |

---

## 3. Estructura del repositorio

```text
tiza/
  CLAUDE.md                 instrucciones para Claude Code (copia de las secciones 4–7)
  docs/
    spec/tiza-formato.md    formato de entrada (contrato C1)
    adr/NNNN-titulo.md      registro de decisiones
    estado.md               tablero corto: qué está en curso y quién
  esquemas/                 JSON Schema de los contratos C2–C5
  paquetes/
    guion/        C1 → C2   analizador y validación
    tipografia/   C2 → C3   LaTeX a glifos con MathJax
    emparejar/    C3 → C4   correspondencias en tres niveles
    animacion/    C4 → C5   gestos, compases, línea de tiempo
    dibujo/       C5 → px   Canvas, efecto tiza, temas
    verificar/    C2 → estados   (Python: verificar-py/)
    exportar/     video, subtítulos, visor HTML, PDF
    asistente/    CLI LLM: proponer, verificar, reintentar
  apps/
    prototipo/    F0: demo de una página
    estudio/      editor con vista previa (F3)
    presentador/  pizarra, vista presentador, fuente OBS (F2)
    escritorio/   Tauri (F7)
  corpus/
    algebra/ fisica/ calculo/ astrofisica/ bordes/
```

---

## 4. Contratos entre paquetes (la clave del trabajo en paralelo)

Cada paquete solo depende de los **contratos**, no de la implementación de otro paquete. Mientras un contrato esté en `esquemas/` con ejemplos, se puede trabajar contra él con datos de prueba.

| Id | Contrato | Productor → consumidor | Archivo |
| --- | --- | --- | --- |
| C1 | Formato `.tiza` | autor → `guion` | `docs/spec/tiza-formato.md` |
| C2 | `PasoCompilado[]` | `guion` → `tipografia`, `verificar`, `asistente` | `esquemas/paso-compilado.schema.json` |
| C3 | `ConjuntoGlifos` por paso (glifos, piezas estirables, ruta MathML, ids, lado) | `tipografia` → `emparejar`, `dibujo` | `esquemas/glifos.schema.json` |
| C4 | `Correspondencias` (parejas, salidas, entradas) | `emparejar` → `animacion` | `esquemas/correspondencias.schema.json` |
| C5 | `LineaDeTiempo` (compases con fases señalar/actuar/asentar y pistas por glifo) | `animacion` → `dibujo`, `exportar`, `presentador` | `esquemas/linea-tiempo.schema.json` |
| C6 | `EstadoVerificacion` por paso | `verificar` → `estudio`, `exportar` | `esquemas/verificacion.schema.json` |

Reglas:

- Cambiar un contrato = PR propio con ADR, revisado por Cris, **antes** de cambiar código que lo use.
- Todo contrato trae al menos 3 ejemplos válidos en `esquemas/ejemplos/`, generados desde el corpus.
- Ningún paquete lee archivos internos de otro.

---

## 5. Frentes de trabajo y paralelismo

| Frente | Paquete(s) | Depende de | Puede empezar | Tipo de sesión |
| --- | --- | --- | --- | --- |
| W0 Andamiaje | raíz, CI, esquemas vacíos | — | ya | Code |
| W1 Formato y analizador | `guion` | C1 | ya | Code |
| W2 Corpus de guiones | `corpus/` | C1 | ya | chat o Code (habilidad de guiones) |
| W3 Tipografía | `tipografia` | C2 (ejemplos) | tras W0 | Code |
| W4 Emparejamiento | `emparejar` | C3 (ejemplos) | tras W0, con glifos de prueba | Code |
| W5 Animación y dibujo | `animacion`, `dibujo` | C4, C5 | tras W0 | Code |
| W6 Prototipo F0 | `apps/prototipo` | W1, W3, W4, W5 mínimos | cuando haya C3–C5 | Code |
| W7 Verificador | `verificar-py` | C2 | ya (Python, independiente) | Code |
| W8 Asistente LLM | `asistente` | C1, W7 | tras W7 CLI | Code (requiere clave API local) |
| W9 Diseño y revisión | docs, ADR, revisión de PR | — | siempre | chat |

Paralelismo seguro hoy: **W0, W1, W2 y W7** no se pisan. W3–W5 arrancan en paralelo apenas W0 publique esquemas y ejemplos.

Orden crítico del prototipo F0: W0 → (W1 ∥ W3) → W4 → W5 → W6. Criterio de salida F0: 80 % de 30 pares de prueba bien emparejados y 60 fps en el equipo de referencia.

---

## 6. Protocolo de cada sesión

**Al empezar**

1. Leer este documento, `docs/estado.md` y el issue que se va a tomar.
2. Si no hay issue, crearlo con: frente (W#), objetivo, contrato(s) que toca, criterio de aceptación.
3. Marcar el issue con la etiqueta `estado: en curso` y comentar `En curso — sesión <fecha> <chat|code|autónoma>`.

**Mientras trabaja**

4. Rama `w<n>/<slug-corto>` desde `main` (ej. `w4/emparejamiento-nivel3`). Una rama por issue.
5. No editar paquetes fuera de su frente. Si necesita algo de otro frente, abrir issue y usar datos de prueba.
6. Commits pequeños en español, formato `paquete: verbo en presente` (ej. `emparejar: agrega costo por cambio de escala`).
7. Pruebas junto al código; cada error corregido deja un caso en `corpus/` o en pruebas.

**Al terminar**

8. PR a `main` cuya primera línea es `Closes #n` (en inglés: GitHub no cierra issues con «Cierra #n»), luego qué cambió, cómo se probó y capturas si es visual.
9. CI en verde (tipos, lint, Vitest, validación del corpus, pruebas visuales).
10. Etiquetar el issue `estado: en revisión` y comentar el estado final y lo pendiente. El Tablero (issue #14) lo actualiza el coordinador.
11. Nunca hacer merge: Cris fusiona todos los PR (decisión del 2026-11-07).

**Sesiones de chat** (sin repositorio local): producen especificaciones, ADR, guiones de corpus y revisiones. Entregan archivos para que una sesión Code o Cris los suba, o abren el PR si tienen acceso a GitHub.

---

## 7. Definición de terminado

- Tipos estrictos sin `any` en APIs públicas; ESLint y Prettier sin errores.
- Cobertura ≥ 80 % en `guion`, `emparejar` y `animacion`.
- Funciona con todos los guiones de `corpus/` marcados `esperado: ok`, y falla con el código esperado en los demás.
- Determinismo: el mismo guion produce los mismos cuadros (prueba de hash por cuadro en 3 instantes).
- Documentación breve en el `README.md` del paquete.

---

## 8. Estado actual

Ver el [Tablero de coordinación (issue #14)](https://github.com/cnvega/tiza/issues/14) y la bitácora `docs/estado.md`.

Calendario base: inicio 30 nov 2026; MVP 19 feb 2027; v1.0 18 jun 2027.

---

## 9. Coordinación y tareas autónomas

Una sesión de chat actúa como **coordinador general**: planifica, abre los issues con sus dependencias, prepara los prompts, revisa los PR por contenido y lleva el tablero. Un **coordinador automático** (tarea programada «Tiza · coordinador») mantiene el ritmo cuando Cris no está.

**Reglas acordadas con Cris (2026-11-07)**

| Regla | Valor |
| --- | --- |
| Quién fusiona PR | Solo Cris, siempre |
| Revisión automática | 08:41 y 18:41 (hora de Chile), y al terminar cada sesión autónoma |
| Sesiones autónomas simultáneas | Máximo 2 |
| Avisos a Cris | Notificación solo cuando algo nuevo requiere su acción |

**Fuentes de verdad**

- **Issues y etiquetas** de GitHub: qué hay que hacer y en qué estado está.
- **Tablero** (issue #14): resumen que el coordinador reescribe en cada revisión.
- `docs/estado.md`: solo la bitácora de hitos (sección «Hecho»); ya no se usa para el día a día.

**Etiquetas**

| Etiqueta | Significado |
| --- | --- |
| `W0` … `W9` | Frente de trabajo |
| `estado: listo` | Dependencias resueltas; se puede tomar |
| `estado: bloqueado` | Espera otro issue o una decisión |
| `estado: en curso` | Una sesión lo tiene asignado |
| `estado: en revisión` | PR abierto esperando a Cris |
| `autónomo` | Lo puede tomar una sesión programada sin intervención |
| `requiere Cris` | Necesita una decisión, una prueba o una aprobación de Cris |
| `contrato` | Cambia C1–C6: ADR obligatorio y aprobación de Cris |
| `pruebas` | Tarea de pruebas o validación |

**Formato de los issues.** La primera línea es `Depende de: #a, #b` (o `Depende de: —`). Luego frente, contratos que toca, objetivo, alcance y criterio de aceptación. Un issue sin criterio de aceptación no se marca `autónomo`.

**Ciclo de una tarea autónoma**

1. El coordinador ve un issue `autónomo` + `estado: listo` y hay cupo: crea la tarea programada «Tiza · #N …» con el prompt de [`docs/prompts/sesion-autonoma.md`](prompts/sesion-autonoma.md) y marca el issue `estado: en curso`.
2. La sesión trabaja en su rama, abre el PR con `Closes #N` y marca el issue `estado: en revisión`.
3. Al terminar, la sesión ejecuta «Tiza · coordinador», que lanza la siguiente tarea lista.
4. Cris revisa y fusiona. El issue se cierra solo y, en la siguiente revisión, el coordinador desbloquea lo que dependía de él.

Si una sesión se traba en una decisión, deja el issue `requiere Cris` + `estado: bloqueado` con una pregunta concreta; el coordinador avisa a Cris.

**Lanzar una sesión a mano.** Abre una sesión nueva de Claude Code con acceso a GitHub y pega el prompt de `docs/prompts/sesion-autonoma.md` con el número del issue. Antes, etiqueta el issue `estado: en curso` para que el coordinador no lo lance dos veces.

