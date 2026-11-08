# Especificación del formato de guion `.tiza` — versión 0.2

Estado: borrador para el prototipo (F0) y el MVP (F1–F2).
Cambios respecto de 0.1 (ADR 0002): índices tensoriales, delimitadores con nombre, paquetes de TeX, cinco gestos y cuatro validaciones (parte para el MVP y parte para la v1.0). Todo guion `tiza/0.1` válido sigue siendo válido.
Fuente de verdad del formato. Cualquier cambio se hace por PR con una nota de decisión (ADR) y sube la versión.

---

## 1. Propósito

Un archivo `.tiza` describe **una derivación matemática** como una secuencia de pasos para animar con efecto pizarrón.

- El autor declara **el qué**: el resultado de cada paso, en LaTeX.
- El motor decide **el cómo**: qué términos se mueven, se borran o se escriben.
- Las **acciones** (`::`) son pistas opcionales para gestos deliberados.

Un `.tiza` es Markdown válido: se lee como apunte en GitHub o en cualquier editor.

---

## 2. Reglas generales del archivo

| Regla | Valor |
| --- | --- |
| Extensión | `.tiza` |
| Codificación | UTF-8 sin BOM |
| Fin de línea | LF (se acepta CRLF y se normaliza) |
| Una derivación por archivo | Obligatorio |
| Nombre de archivo | `kebab-case`, sin espacios: `kepler-tercera-ley.tiza` |
| Comentarios | `<!-- ... -->` de HTML; se ignoran |
| Líneas en blanco | Libres entre bloques; no tienen significado |

Estructura obligatoria, en este orden:

1. Encabezado YAML entre líneas `---`.
2. Uno o más bloques de paso, cada uno iniciado por `##`.

---

## 3. Encabezado (YAML)

```yaml
---
formato: tiza/0.2
titulo: Tercera ley de Kepler para una órbita circular
curso: Astrofísica
etiquetas: [gravitación, órbitas]
tema: pizarron-verde
ritmo: 1.0
pizarra: lineas
alinear: "="
idioma: es
paquetes: []
macros: |
  \newcommand{\dd}{\mathrm{d}}
supuestos:
  positivos: [G, M, m, r, T, v]
  reales: []
  no-nulos: []
---
```

| Clave | Tipo | Valores | Por omisión | Obligatoria |
| --- | --- | --- | --- | --- |
| `formato` | texto | `tiza/0.2` (se acepta `tiza/0.1`) | — | Sí |
| `titulo` | texto | libre | — | Sí |
| `curso` | texto | libre | ninguno | No |
| `etiquetas` | lista de textos | libre | `[]` | No |
| `tema` | enum | `pizarron-verde`, `pizarron-negro`, `pizarra-blanca`, `transparente` | `pizarron-verde` | No |
| `ritmo` | número | 0.25 a 3 | `1.0` | No |
| `pizarra` | enum | `lineas`, `en-lugar` | `lineas` | No |
| `alinear` | texto | `"="`, `"\approx"`, `"<"`, `">"`, `"\le"`, `"\ge"`, `ninguna` | `"="` | No |
| `idioma` | enum | `es`, `en` | `es` | No |
| `paquetes` | lista | `physics` (opcional; ver 5.2) | `[]` | No |
| `macros` | bloque de texto | definiciones `\newcommand` / `\renewcommand` | vacío | No |
| `supuestos` | mapa | claves `positivos`, `reales`, `no-nulos`, cada una lista de símbolos | todos `reales` | No |

Notas:

- `alinear: "="` debe ir entre comillas (YAML).
- Los símbolos de `supuestos` se escriben como en LaTeX sin `$`: `r`, `v_0`, `\theta`.
- Claves desconocidas producen **advertencia**, no error (compatibilidad futura).

---

## 4. Bloque de paso

```markdown
## Título opcional del paso
:: accion-previa argumentos
$$ fórmula en LaTeX $$
:: accion-posterior argumentos
> Narración (una o más líneas).
```

| Elemento | Prefijo | Cantidad | Función |
| --- | --- | --- | --- |
| Encabezado | `##` + espacio | 1, obligatorio | Inicia el paso. El título puede quedar vacío (`##`). |
| Acciones previas | `::` | 0 o más | Preparan la transición desde el paso anterior. |
| Fórmula | `$$ … $$` | 0 o 1 | Resultado del paso. |
| Acciones posteriores | `::` | 0 o más | Decoran el resultado (recuadro, nota, llave…). |
| Narración | `>` | 0 o más líneas | Guion hablado, subtítulos y apunte. Las líneas se unen con espacio. |

Reglas:

- El **primer paso** debe tener fórmula y no puede tener acciones previas de transformación (`pasar`, `cancelar`, `sustituir`, `expandir`, `factorizar`, `simplificar`, `ambos-lados`, `derivar`, `integrar`).
- Un paso **sin fórmula** solo agrega marcas sobre la línea actual (resaltar, nota, flecha, llave, recuadro, pausa).
- La fórmula puede ocupar varias líneas entre `$$` de apertura y `$$` de cierre.
- Dentro de `$$ … $$` va **una sola relación principal** (o ninguna, si es una expresión). Nada de `align`, `\\` ni `&` en v0.1.
- Cada línea `::` es un **compás**. Varias acciones en la misma línea unidas con ` + ` ocurren en el mismo compás.

---

## 5. LaTeX admitido

Base: modo matemático de LaTeX con AMS (`amsmath`, `amssymb`) y `braket`, tal como lo procesa MathJax 4.

Admitido y esperado en física y cálculo:

- Fracciones `\frac`, `\tfrac`, `\dfrac`; raíces `\sqrt`, `\sqrt[n]`.
- Sub y superíndices; primas `f'`; puntos `\dot{x}`, `\ddot{x}`.
- Derivadas: `\frac{\mathrm{d}v}{\mathrm{d}t}`, `\frac{\partial f}{\partial x}`, `\nabla`.
- Integrales y sumas: `\int_a^b`, `\iint`, `\oint`, `\sum_{i=1}^{n}`, `\prod`, `\lim_{x\to 0}`.
- Vectores: `\vec{v}`, `\hat{n}`, `\mathbf{F}`, `\boldsymbol{\omega}`.
- Delimitadores de todo tipo y tensores: ver 5.2 y 5.3.
- Unidades en texto recto: `\mathrm{m\,s^{-1}}`.
- Letras griegas, `\cdot`, `\times`, `\approx`, `\propto`, `\sim`, `\pm`.
- Funciones: `\sin`, `\cos`, `\ln`, `\exp`, `\log`.
- Espaciado fino: `\,`, `\;`, `\quad`.

No admitido en v0.2 (error): entornos (`\begin{...}`), `\\`, `&`, `\text{}` con LaTeX anidado, `\color` (los colores los decide el motor), `\label`, `\tag`.

### 5.1 Macro `\id`

```latex
\id{nombre}{expresión}
```

- Marca una subexpresión para emparejarla entre pasos o referirla desde una acción.
- `nombre`: `[a-z][a-z0-9-]*`, máximo 24 caracteres, único dentro del paso.
- El mismo `nombre` en dos pasos consecutivos fuerza que esos términos se emparejen.
- Fuera de Tiza, en LaTeX común, se define como identidad: `\newcommand{\id}[2]{#2}`.

### 5.2 Delimitadores

Todos los tipos se admiten, con tamaño fijo o ajustado al contenido.

| Tipo | Fijo | Ajustado al contenido | Uso típico |
| --- | --- | --- | --- |
| Paréntesis | `( )` | `\left( … \right)` | Agrupar, argumentos |
| Corchetes | `[ ]` | `\left[ … \right]` | Conmutadores, intervalos |
| Llaves | `\{ \}` | `\left\{ … \right\}` | Anticonmutadores, conjuntos |
| Angulares | `\langle \rangle` | `\left\langle … \right\rangle` | Valores esperados, Dirac |
| Barras | `\lvert \rvert` | `\left\lvert … \right\rvert` | Módulo |
| Barras dobles | `\lVert \rVert` | `\left\lVert … \right\rVert` | Norma |
| Piso y techo | `\lfloor \rfloor`, `\lceil \rceil` | con `\left` / `\right` | Redondeo |

- Tamaños manuales: `\big`, `\Big`, `\bigg`, `\Bigg` (con `l` y `r`).
- Separador interno ajustado: `\middle|` (por ejemplo, ⟨φ \middle| ψ⟩).
- Se pueden mezclar tipos en un mismo par ajustado, como en intervalos `\left[ 0, 1 \right)`.
- `\left` y `\right` deben formar pares dentro de la fórmula (E13).

**Macros de delimitadores de Tiza.** Se ajustan solas al alto del contenido y coinciden en nombre y significado con las del paquete `physics`:

| Macro | Resultado | Ejemplo |
| --- | --- | --- |
| `\comm{A}{B}` | [A, B] | `\comm{\hat{x}}{\hat{p}} = i\hbar` |
| `\acomm{A}{B}` | {A, B} | `\acomm{\sigma_i}{\sigma_j} = 2\delta_{ij}` |
| `\expval{A}` | ⟨A⟩ | `\expval{\hat{H}}` |
| `\abs{x}` | \|x\| | `\abs{\psi}^2` |
| `\norm{x}` | ‖x‖ | `\norm{\vec{v}}` |

**Notación de Dirac (paquete `braket`, siempre activo).** `\bra{\phi}` → ⟨φ|, `\ket{\psi}` → |ψ⟩, `\braket{\phi | \psi}` → ⟨φ|ψ⟩, `\braket{\phi | \hat{A} | \psi}` → ⟨φ|Â|ψ⟩. Las versiones con mayúscula (`\Bra`, `\Ket`, `\Braket`) ajustan el tamaño al contenido.

**Paquete `physics` (opcional).** Se activa con `paquetes: [physics]` y suma `\qty`, `\dv`, `\pdv`, `\mel`, `\vb`, entre otros. Redefine `\div` (deja de ser ÷), `\dd` y otros comandos comunes, por eso produce la advertencia W08. Con `physics`, `\braket{a}{b}` usa la sintaxis de dos argumentos de ese paquete.

### 5.3 Índices tensoriales

- **Índices simples:** `p^{\mu}`, `g_{\mu\nu}`, `x^{\mu'}`, `\partial_{\mu}`.
- **Índices escalonados** (cada índice en su columna): con llaves vacías, `T^{\mu}{}_{\nu}`, o con la macro de Tiza `\tensor`:

```latex
\tensor{T}{^\mu_\nu}            % T^{\mu}{}_{\nu}
\tensor{R}{^\rho_{\sigma\mu\nu}}  % R^{\rho}{}_{\sigma\mu\nu}
\tensor{\Gamma}{^\lambda_{\mu\nu}}
```

  `\tensor` usa la sintaxis del paquete `tensor` de LaTeX: el guion se lleva a un documento LaTeX con `\usepackage{tensor}` sin cambios. Los índices seguidos en la misma posición se agrupan: `{^\rho_\sigma_\mu_\nu}` equivale a `{^\rho_{\sigma\mu\nu}}`.
- **Derivadas en índices:** coma y punto y coma se admiten como texto del índice: `\tensor{T}{^\mu_{\nu;\mu}}`.
- **Convención de Einstein:** un índice repetido una vez arriba y una abajo en un mismo término es mudo y se suma. El validador usa esta convención para W06 y W07.
- **Posición:** cada glifo de un índice sabe si es superior o inferior. Las referencias pueden pedir una posición (sección 6).

---

## 6. Referencias a términos

Las acciones nombran términos de tres formas:

| Forma | Ejemplo | Significado |
| --- | --- | --- |
| Identificador | `ms` | El término marcado con `\id{ms}{…}` |
| Fragmento LaTeX | `T^2` | El subárbol que coincide por estructura (no por texto) |
| Fragmento con aparición | `r#2` | La segunda aparición en orden de lectura |
| Índice con posición | `^\mu`, `_\nu#2` | Solo índices superiores (`^`) o inferiores (`_`) con ese símbolo |

- Se resuelven en el **paso anterior** si la acción es previa, y en el **paso actual** si es posterior.
- `\frac{GM}{r}` encuentra `\frac{G M}{r}`: espacios y llaves redundantes no importan.
- Fragmento ambiguo sin `#n` → **error** de validación.
- Un fragmento con espacios va entre llaves: `{\tfrac12 m v^2}`.

Lados: `izq` (lado izquierdo de la relación principal) y `der`.

---

## 7. Vocabulario de acciones

Firma: `verbo argumentos…`. `REF` = referencia (sección 6), `LADO` = `izq|der`, `TEX` = LaTeX (entre llaves si tiene espacios), `"…"` = cadena (admite LaTeX en línea), `NUM` = número decimal con punto.

| Verbo | Firma | Posición | Efecto | Entrega |
| --- | --- | --- | --- | --- |
| `pasar` | `pasar REF LADO` | previa | El término cruza la relación en arco; invierte su operación (suma↔resta, producto↔cociente) | MVP |
| `cancelar` | `cancelar REF REF…` | previa | Tacha y desvanece los términos | MVP |
| `resaltar` | `resaltar REF…` | previa o posterior | Subraya o encierra en color | MVP |
| `borrar` | `borrar [REF…]` | previa | Borra términos; sin argumentos, borra la pizarra | MVP |
| `pausa` | `pausa NUM` | cualquiera | Detiene NUM segundos; en vivo, espera clic | MVP |
| `en-lugar` | `en-lugar` | previa | Este paso transforma la línea actual en vez de escribir una nueva | MVP |
| `nueva-linea` | `nueva-linea` | previa | Este paso escribe una línea nueva (útil si `pizarra: en-lugar`) | MVP |
| `renombrar` | `renombrar TEX TEX [REF]` | previa | Transforma en el lugar cada aparición del primer símbolo en el segundo (índices mudos), dentro de REF o en toda la línea | MVP |
| `contraer` | `contraer REF REF` | previa | Une con un arco el par de índices repetidos y aplica la contracción | v1.0 |
| `bajar` | `bajar REF` | previa | El índice baja en arco mientras se escribe la métrica que lo baja | v1.0 |
| `subir` | `subir REF` | previa | El índice sube en arco mientras se escribe la métrica inversa | v1.0 |
| `intercambiar` | `intercambiar REF REF` | previa | Dos términos o factores cambian de lugar en arcos cruzados (orden de operadores) | MVP |
| `sustituir` | `sustituir TEX = TEX` | previa | Muestra la igualdad al margen y lleva la expresión a su lugar. Toma el resto de la línea | v1.0 |
| `expandir` | `expandir [REF]` | previa | Arcos distributivos y escritura término a término | v1.0 |
| `factorizar` | `factorizar REF` | previa | Reúne el factor común adelante | v1.0 |
| `simplificar` | `simplificar [REF]` | previa | Funde términos o potencias en el lugar | v1.0 |
| `ambos-lados` | `ambos-lados TEX` | previa | Escribe la operación a cada lado y la absorbe. Toma el resto de la línea | v1.0 |
| `derivar` | `derivar VAR` | previa | Antepone d/dVAR a ambos lados | v1.0 |
| `integrar` | `integrar VAR [TEX TEX]` | previa | Integral a ambos lados, con límites opcionales | v1.0 |
| `aproximar` | `aproximar "…"` | previa | Muestra la aproximación al margen; el paso es no exacto | v1.0 |
| `nota` | `nota "…" [LADO]` | cualquiera | Anotación al margen (por omisión `der`) | v1.0 |
| `llave` | `llave REF "…"` | posterior | Llave bajo el término, con etiqueta | v1.0 |
| `flecha` | `flecha REF REF` | cualquiera | Flecha entre dos términos | v1.0 |
| `recuadro` | `recuadro [REF]` | posterior | Encierra el resultado o un término | v1.0 |
| `columna` | `columna` | previa | Abre una columna nueva en la pizarra | v1.0 |

Reglas:

- Si el motor aún no implementa una acción, el paso se reproduce con la **transición automática** y se emite una advertencia. Nunca es error.
- Verbo desconocido → **error**.
- No existe `mover` ni `escribir`: son el comportamiento por omisión.

---

## 8. Validación

| Código | Nivel | Condición |
| --- | --- | --- |
| E01 | error | Falta el encabezado o `formato` |
| E02 | error | `formato` distinto de `tiza/0.1` y `tiza/0.2` |
| E03 | error | Falta `titulo` |
| E04 | error | No hay pasos, o el primer paso no tiene fórmula |
| E05 | error | LaTeX que MathJax no compone |
| E06 | error | Más de una fórmula en un paso |
| E07 | error | Construcción no admitida (sección 5) |
| E08 | error | Verbo desconocido o argumentos que no calzan con la firma |
| E09 | error | Referencia inexistente |
| E10 | error | Referencia ambigua sin `#n` |
| E11 | error | `\id` con nombre inválido o repetido en el paso |
| E12 | error | Acción de transformación previa en el primer paso |
| E13 | error | `\left` o `\right` sin pareja en la fórmula |
| W01 | advertencia | Clave de encabezado desconocida |
| W02 | advertencia | Acción aún no implementada en esta versión del motor |
| W03 | advertencia | Paso con más de 60 glifos (legibilidad en proyección) |
| W04 | advertencia | Más de 12 pasos en un guion (dividir la derivación) |
| W05 | advertencia | Símbolo usado en el paso que no aparece en `supuestos` cuando hay supuestos declarados |
| W06 | advertencia | Los índices libres no son los mismos a ambos lados de la ecuación (desde la v1.0) |
| W07 | advertencia | Un índice aparece más de dos veces en un mismo término (desde la v1.0) |
| W08 | advertencia | Paquete `physics` activo: `\div`, `\dd` y otros comandos cambian de significado |

Los mensajes indican archivo, línea y columna.

---

## 9. Modelo compilado (resumen)

El analizador produce, por paso, un `PasoCompilado` (esquema completo en `esquemas/paso-compilado.schema.json`):

```json
{
  "id": "p6",
  "titulo": "T² pasa multiplicando",
  "latex": "\\frac{G M}{r}\\, T^2 = 4\\pi^2 r^2",
  "modo": "nueva-linea",
  "compases": [
    { "acciones": [ { "verbo": "pasar", "objetivos": ["T^2"], "lado": "izq" } ] }
  ],
  "narracion": "El período al cuadrado sale del denominador y pasa multiplicando.",
  "linea": 41
}
```

`id` = `p` + número de paso desde 1. `linea` = línea del `##` en el archivo fuente.

---

## 10. Ejemplos

### 10.1 Mínimo válido

```markdown
---
formato: tiza/0.2
titulo: Despeje lineal
---

## Ecuación inicial
$$ 3x + 5 = 20 $$

## El 5 pasa restando
:: pasar 5 der
$$ 3x = 20 - 5 $$

##
$$ 3x = 15 $$

## El 3 pasa dividiendo
:: pasar 3 der
$$ x = \frac{15}{3} $$

##
$$ x = 5 $$
> Despejamos x.
```

### 10.2 Completo: tercera ley de Kepler

```markdown
---
formato: tiza/0.2
titulo: Tercera ley de Kepler para una órbita circular
curso: Astrofísica
tema: pizarron-verde
ritmo: 1.0
pizarra: lineas
alinear: "="
supuestos:
  positivos: [G, M, m, r, T, v]
---

## Igualamos fuerzas
$$ \frac{G M \id{ms}{m}}{r^2} = \frac{\id{mc}{m}\, v^2}{r} $$
> En una órbita circular, la gravedad aporta la fuerza centrípeta.

## La masa del satélite se cancela
:: cancelar ms mc
$$ \frac{G M}{r^2} = \frac{v^2}{r} $$
> La masa m aparece a ambos lados: el período no depende de ella.

## Multiplicamos por r
:: ambos-lados \cdot r
$$ \frac{G M}{r} = v^2 $$

## Escribimos la velocidad con el período
:: sustituir v = \frac{2\pi r}{T}
$$ \frac{G M}{r} = \left(\frac{2\pi r}{T}\right)^2 $$
> En una vuelta, el satélite recorre 2πr en un tiempo T.

## Desarrollamos el cuadrado
:: expandir
$$ \frac{G M}{r} = \frac{4\pi^2 r^2}{T^2} $$

## T² pasa multiplicando
:: pasar T^2 izq
$$ \frac{G M}{r}\, T^2 = 4\pi^2 r^2 $$

## GM/r pasa dividiendo
:: pasar \frac{GM}{r} der
$$ T^2 = \frac{4\pi^2 r^2\, r}{G M} $$

## Reunimos las potencias de r
:: simplificar r
$$ T^2 = \frac{4\pi^2}{G M}\, r^3 $$
:: recuadro
> El cuadrado del período crece como el cubo del radio: la tercera ley de Kepler.
```

### 10.3 Cuántica: conmutador de posición y momento

```markdown
---
formato: tiza/0.2
titulo: Conmutador de posición y momento
---

## Definición del conmutador
$$ \comm{\hat{x}}{\hat{p}} f = \hat{x}\hat{p} f - \hat{p}\hat{x} f $$

## Momento en representación de posición
:: sustituir \hat{p} = -i\hbar \frac{d}{dx}
$$ \comm{\hat{x}}{\hat{p}} f = -i\hbar\, x \frac{df}{dx} + i\hbar \frac{d}{dx}\left( x f \right) $$

## Regla del producto
$$ \comm{\hat{x}}{\hat{p}} f = -i\hbar\, x \frac{df}{dx} + i\hbar \left( f + x \frac{df}{dx} \right) $$

## Distribuimos
$$ \comm{\hat{x}}{\hat{p}} f = \id{a}{-i\hbar\, x \frac{df}{dx}} + i\hbar f \id{b}{+ i\hbar\, x \frac{df}{dx}} $$

## Se cancelan
:: cancelar a b
$$ \comm{\hat{x}}{\hat{p}} f = i\hbar f $$
:: recuadro
```

### 10.4 Relatividad: índices y renombre de índice mudo

```markdown
---
formato: tiza/0.2
titulo: Derivada covariante de un tensor mixto
---

## Conservación
$$ \nabla_{\mu} \tensor{T}{^\mu_\nu} = 0 $$

## Expandimos la derivada covariante
$$ \partial_{\mu} \tensor{T}{^\mu_\nu} + \tensor{\Gamma}{^\mu_{\mu\lambda}} \tensor{T}{^\lambda_\nu} - \tensor{\Gamma}{^\lambda_{\mu\nu}} \tensor{T}{^\mu_\lambda} = 0 $$

## Renombramos el índice mudo
:: renombrar \lambda \sigma
$$ \partial_{\mu} \tensor{T}{^\mu_\nu} + \tensor{\Gamma}{^\mu_{\mu\sigma}} \tensor{T}{^\sigma_\nu} - \tensor{\Gamma}{^\sigma_{\mu\nu}} \tensor{T}{^\mu_\sigma} = 0 $$
```

---

## 11. Guía para guiones de prueba

Los guiones de prueba alimentan el corpus (`corpus/`) y deben cubrir de forma deliberada lo que el motor tiene que resolver.

**Ubicación y nombre.** `corpus/<categoria>/<nn>-<slug>.tiza`, con categoría `algebra`, `fisica`, `calculo`, `astrofisica` o `bordes`.

**Cada guion de prueba debe:**

1. Ser matemáticamente correcto paso a paso (un paso = una operación).
2. Tener entre 3 y 10 pasos.
3. Declarar `supuestos` cuando haya divisiones por variables.
4. Incluir en el encabezado una clave `prueba` (se ignora en producción, W01 no aplica):

```yaml
prueba:
  objetivo: pasar un término desde un denominador al otro lado
  cubre: [pasar, cancelar, fraccion, potencia]
  esperado: ok          # ok | error:E09 | advertencia:W02
```

**Matriz mínima de cobertura del prototipo (F0):**

| Caso | Qué pone a prueba |
| --- | --- |
| Despeje lineal | `pasar` con suma y producto |
| Término desde un denominador | `pasar` con cambio de rol (divisor a factor) |
| Cancelación de un factor común | `cancelar` con `\id` |
| Términos repetidos | Referencias `#n` y emparejamiento por orden |
| Exponente que cambia de rol | Escala base ↔ exponente |
| Reordenar sumandos | Emparejamiento sin acciones |
| Fracciones anidadas | Piezas estirables (rayas de fracción) |
| Paréntesis que aparecen o desaparecen | Delimitadores estirables |
| Derivada de Leibniz y punto | Notación de cálculo |
| Integral definida | Límites y diferencial |
| Vectores y unidades | `\vec`, `\hat`, `\mathrm{}` |
| Guion con error deliberado | Validación E05, E09 o E10 |
| Conmutador y anticonmutador | `\comm`, `\acomm`, corchetes y llaves ajustados |
| Valor esperado y Dirac | `\expval`, `\bra`, `\ket`, `\braket` con `\middle` |
| Índices escalonados | `\tensor`, índices superiores e inferiores en columnas |
| Bajar y subir índices | `bajar`, `subir` con la métrica |
| Contracción | `contraer` y convención de Einstein |
| Renombre de índice mudo | `renombrar` en varios términos a la vez |
| Orden de operadores | `intercambiar` y conmutador que aparece |

**Casos borde (categoría `bordes`):** paso sin fórmula con solo `resaltar`; fórmula multilínea; `en-lugar` dentro de `pizarra: lineas`; referencia ambigua sin `#n` (esperado: error E10); acción v1.0 en el MVP (esperado: W02); `\left` sin `\right` (E13); índices libres distintos a cada lado (W06); índice repetido tres veces (W07); `paquetes: [physics]` (W08).

---

## 12. Gramática (EBNF)

```text
guion         = encabezado , paso , { paso } ;
encabezado    = "---" , salto , yaml , "---" , salto ;
paso          = "##" , [ " " , titulo ] , salto ,
                { linea-accion } , [ formula ] , { linea-accion } , { narracion } ;
linea-accion  = "::" , " " , accion , { " + " , accion } , salto ;
accion        = verbo , { " " , argumento } ;
argumento     = referencia | lado | numero | cadena | "{" , latex , "}" ;
referencia    = identificador | [ "^" | "_" ] , latex-sin-espacios , [ "#" , entero ] ;
lado          = "izq" | "der" ;
formula       = "$$" , latex , "$$" , salto ;
narracion     = ">" , [ " " , texto ] , salto ;
```

`sustituir` y `ambos-lados` toman el resto de la línea como LaTeX.

`renombrar` toma dos símbolos (TEX) y, opcionalmente, una referencia que limita dónde se aplica.

---

## 13. Versionado

- `tiza/0.x`: puede cambiar sin compatibilidad hacia atrás; cada cambio se anota en `docs/adr/`.
- `tiza/0.2` (ADR 0002): agrega índices tensoriales, delimitadores con nombre, la clave `paquetes`, cinco gestos y E13, W06–W08. Es compatible con `tiza/0.1`.
- `tiza/1.0`: congelado con la v1.0 de la app; desde ahí, solo cambios compatibles en versiones menores.
