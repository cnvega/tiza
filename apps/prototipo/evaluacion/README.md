# Modo evaluación del prototipo F0

Sirve para que la prueba en sala (issue #13) produzca números: **aciertos del emparejamiento** en 30 pares de prueba y **cuadros por segundo** en el equipo de la sala. El criterio de salida de F0 es 80 % de aciertos y 60 fps.

## Antes de empezar (5 minutos)

1. Abre el prototipo en el computador y el proyector de la sala:
   - versión publicada: https://claude.ai/artifact/Ueg8LhVjy8gtTkvtYjhymB (una vez actualizada con esta versión), o
   - en local: desde `apps/prototipo`, `python3 -m http.server 8765` y abre `http://localhost:8765/index.html?local=1&evaluar=1` (instala antes las dependencias como dice el `README.md` del prototipo).
2. Si no ves el panel de evaluación bajo la pizarra, pulsa **Evaluar** en la barra superior. Al activarlo se enciende también **Parejas**: líneas azules = emparejado por `\id`, amarillas = por acción, violetas = automático; cuadros rojos = glifos que salen, círculos verdes = glifos que entran.
3. Deja la velocidad en **1×** y el modo **Pizarra: según guion**. Pon el navegador en pantalla completa con la tecla del navegador (F11), no con ⛶, para que el panel siga visible.
4. Si quedó una evaluación anterior, pulsa **Borrar evaluación** dos veces (no aparece ningún diálogo: el botón cambia a «¿Seguro? Clic otra vez»).

## Evaluar los 30 pares (20–30 minutos)

1. Pulsa **Par ▶** (o la tecla <kbd>N</kbd>). Se carga el par 01: el guion queda quieto en el paso anterior y medio segundo después se anima la transición.
2. Mira la transición. ¿Cada símbolo fue a donde debía? Usa las líneas de Parejas para revisar. <kbd>R</kbd> (o **Repetir**) la vuelve a mostrar.
3. Marca:
   - <kbd>B</kbd> (o **Bien**) si todos los símbolos se emparejaron bien;
   - <kbd>M</kbd> (o **Mal**) si alguno se emparejó mal, salió o entró cuando debía viajar. El cursor salta a la nota: escribe qué falló (por ejemplo «el 2 del exponente entra nuevo en vez de bajar») y pulsa <kbd>Enter</kbd>.
4. Pulsa <kbd>N</kbd> para el siguiente par. Repite hasta el par 30. El selector **Par** muestra ✓ o ✗ junto a cada par ya marcado; puedes volver a cualquiera y cambiar la marca.
5. La línea de resumen lleva la cuenta: pares marcados, aciertos (meta 80 %) y fps.

Las marcas se guardan solas en el navegador (`localStorage`); si recargas la página, siguen ahí. En una ventana privada o en la vista previa pueden perderse al cerrar: copia el resultado antes.

Fuera de la lista también puedes marcar cualquier transición de cualquier guion: avanza con <kbd>→</kbd> hasta ella y pulsa <kbd>B</kbd> o <kbd>M</kbd>. Aparece en el resultado como «otras transiciones».

## Entregar el resultado

1. Pulsa **Copiar resultado**. El JSON aparece en el cuadro de abajo y se copia al portapapeles. Si el navegador no deja copiar, el texto queda seleccionado: copia con <kbd>Ctrl</kbd>+<kbd>C</kbd> (<kbd>⌘</kbd>+<kbd>C</kbd> en Mac).
2. Pégalo en un comentario del issue #13 dentro de un bloque de código (tres comillas invertidas antes y después).
3. Agrega en el mismo comentario lo que el JSON no mide: legibilidad desde el fondo de la sala, ritmo y modelo del equipo.

## Qué contiene el JSON

- `resumen`: pares marcados, `bien`, `mal`, `aciertos` (%), `meta` (80), `cumpleMeta` (solo cuando están los 30), `fps.promedio` y `fps.p5Peor` (el peor percentil 5 entre las transiciones medidas).
- `marcas`: una por transición, con `par`, `guion`, `transicion`, títulos de los pasos, `veredicto`, `nota`, conteo de parejas (`id`, `accion`, `auto`, `salen`, `entran`), modo de pizarra, velocidad y `fps` de esa transición: `promedio`, `p5` (cuadros por segundo del 5 % de cuadros más lentos), `cuadros`, `costoMs` (tiempo medio de dibujo de un cuadro) y `completa` (falso si se saltó la transición con →).
- `navegador` y `pantalla`, para saber en qué equipo se midió.

Los fps se miden durante cada transición hacia adelante; el HUD de la pizarra los muestra en vivo en modo evaluación. Si saltas una transición, la medición queda marcada `completa: false`; con <kbd>R</kbd> se mide de nuevo.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `pares.md` | Los 30 pares, con su guion, transición y qué ponen a prueba |
| `generar-pares.mjs` | Fuente de la lista: la incrusta en `index.html` y escribe `pares.md` (`--revisar` comprueba que estén al día) |
| `prueba-evaluacion.cjs` | Prueba con Playwright del modo evaluación (30 pares, teclas, nota, JSON, recarga, sin `localStorage`, teléfono); deja capturas en `docs/capturas/12/` |
| `medir-fps.cjs` | Mide los fps de los 30 pares; lo corre el flujo `Prototipo · fps` de GitHub Actions en cada PR que toca el prototipo, sin umbral |

Con el servidor local en marcha, desde `apps/prototipo`:

```bash
node evaluacion/prueba-evaluacion.cjs
node evaluacion/medir-fps.cjs            # o --pares 5 para una pasada corta
```
