# apps/prototipo — Tiza F0

Prueba de concepto de una sola página. Responde la pregunta de mayor riesgo del proyecto: si el emparejamiento automático de glifos entre pasos produce una animación de pizarrón creíble.

Versión publicada: https://claude.ai/artifact/Ueg8LhVjy8gtTkvtYjhymB

## Qué hace

- Lee un guion `.tiza` (especificación `tiza/0.2`; acepta `tiza/0.1`) con validación básica (E01–E13, W01–W04, W08).
- TeX: AMS y `braket` siempre; `physics` solo con `paquetes: [physics]` (W08; sin `braket`, porque `physics` trae su propio `\braket{a}{b}`). Macros de Tiza `\comm`, `\acomm`, `\expval`, `\abs`, `\norm`, y `\tensor{T}{^\mu_\nu}` expandido a `{T}^{\mu}{}_{\nu}` antes de componer.
- Cada glifo sabe si es superíndice (`^`) o subíndice (`_`), según su ancestro `msup`/`msub`/`msubsup` en el SVG; las referencias `^\mu` y `_\nu#2` filtran por esa posición.
- Compone cada paso con MathJax 4.1.3 (TeX → SVG, `fontCache: 'none'`) y extrae glifos con su carácter, matriz, caja, `\id` y lado de la relación.
- Empareja glifos entre pasos:
  1. `\id` del autor;
  2. acción `pasar` (fragmento en el paso anterior → mismo fragmento en el lado indicado);
  3. asignación por carácter con algoritmo húngaro (costo: posición, tamaño, orden de lectura, cambio de lado).
  Las rayas de fracción se emparejan aparte y se interpolan en ancho.
- Línea de tiempo por paso: señalar (resalte y tachado) → copiar lo estable → mover lo que cambia de rol (en arco si cruza la relación) → escribir lo nuevo → recuadro.
- Reloj virtual: `frame(k, tau)` es función pura; retroceder reproduce la transición al revés.
- Efecto tiza: capa de tinta con grano restado (`destination-out`), punta de tiza en el frente de escritura, tres temas.
- Modos de pizarra: líneas nuevas (lo estable se reescribe, solo viaja lo que cambia de rol) o en el lugar (todo se desliza).
- Vista "Parejas" para auditar el emparejamiento.

## Implementado del vocabulario

`pasar`, `cancelar`, `resaltar`, `pausa`, `recuadro`, `en-lugar`, `nueva-linea`, `renombrar` e `intercambiar`. El resto (incluidos `contraer`, `bajar` y `subir`) produce W02 y usa la transición automática.

- `renombrar A B [REF]`: el paso se hace en el lugar; cada A del paso anterior (dentro de REF, si se da) se empareja con la B más cercana en la misma posición de índice y cambia de forma con un fundido cruzado mientras se mueve. No borra ni reescribe nada más.
- `intercambiar REF REF`: cada término viaja a la aparición del mismo fragmento más cercana al lugar del otro, uno en arco por arriba y otro por abajo.

El encabezado enlaza el código fuente (https://github.com/cnvega/tiza), como pide la AGPL §13 (ADR 0001).

## Probar en local

```bash
npm i mathjax@4.1.3 @mathjax/mathjax-newcm-font@4.1.3 js-yaml@4
python3 -m http.server 8765
# abrir http://localhost:8765/index.html?local=1
```

Con `?local=1` carga MathJax y la fuente desde `node_modules`; sin el parámetro, desde jsDelivr. js-yaml viene de cdnjs.

**Prueba de aceptación** (Playwright con Chromium): con el servidor anterior en marcha,

```bash
node prueba-aceptacion.cjs
```

Carga los ejemplos 10.1–10.4 de la especificación, los guiones de `corpus/` y casos de `intercambiar`, E13, W08 y referencias con posición; comprueba que `renombrar \lambda \sigma` en 10.4 da 4 transformaciones sin salidas ni entradas, y deja capturas en `docs/capturas/9/`. Sirve js-yaml desde `node_modules` y no pide Google Fonts.

## Observaciones de la prueba (2026-11-07)

- Kepler (8 pasos), caída libre (4) y despeje (5): sin errores; emparejamientos correctos en todas las transiciones revisadas.
- En modo líneas, mover todos los términos emparejados se veía caótico; se cambió a mover solo lo que cambia de rol y reescribir el resto. Candidato a ADR para C5.
- Con `\frac{GM}{r}` que reaparece separado (G M arriba, r en el numerador), el fragmento no se encuentra como secuencia; se resolvió con `\id`. El nivel estructural (Compute Engine) debería cubrirlo en F1.
- Pendiente medir: 60 fps en el equipo de la sala, legibilidad en proyector y la meta de 80 % de 30 pares.

## Observaciones de tiza/0.2 (2026-11-08)

- Los cuatro ejemplos de la especificación y los tres guiones del corpus cargan sin errores (solo W02 por acciones de la v1.0).
- En 10.4, renombrar λ → σ transforma los cuatro λ en el lugar (23 parejas, 0 salen, 0 entran).
- En 10.3, al cancelar `a` y `b` salen 17 glifos y la última línea se escribe nueva, como se espera en modo líneas.
