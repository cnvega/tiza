#!/usr/bin/env node
// Genera la lista de 30 pares de prueba del modo evaluación (issue #12).
//
// Fuente única: la constante PARES de este archivo. A partir de ella:
//   1. incrusta en apps/prototipo/index.html los guiones que usan los pares
//      (el artefacto publicado no puede leer el repositorio) y la lista PARES,
//      entre las marcas «<evaluacion:generado>» y «</evaluacion:generado>»;
//   2. escribe apps/prototipo/evaluacion/pares.md con la tabla legible.
//
// Uso, desde la raíz del repositorio:
//   node apps/prototipo/evaluacion/generar-pares.mjs            regenera ambos archivos
//   node apps/prototipo/evaluacion/generar-pares.mjs --revisar  sale con 1 si están desactualizados

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "../../..");
const HTML = resolve(AQUI, "../index.html");
const MD = resolve(AQUI, "pares.md");

/**
 * Un par es la transición del paso `a - 1` al paso `a` (numerados desde 1) de un guion.
 * `guion`: ruta dentro de corpus/ sin extensión, o «spec 10.n» para un ejemplo de la especificación.
 * `prueba`: qué pone a prueba, con los nombres de la matriz de cobertura (especificación, sección 11).
 */
const PARES = [
  { guion: "algebra/01-despeje-lineal", a: 2, prueba: "Despeje lineal: pasar con suma, en el lugar" },
  { guion: "algebra/01-despeje-lineal", a: 4, prueba: "Despeje lineal: pasar con producto (factor a divisor), en el lugar" },
  { guion: "spec 10.1", a: 2, prueba: "Despeje lineal: pasar con suma, en líneas nuevas" },
  { guion: "spec 10.1", a: 3, prueba: "Reordenar y simplificar sin acciones (paso sin título)" },
  { guion: "astrofisica/01-kepler-tercera-ley", a: 2, prueba: "Cancelación de un factor común con \\id" },
  { guion: "astrofisica/01-kepler-tercera-ley", a: 4, prueba: "Paréntesis que aparecen (\\left…\\right) y fracciones anidadas" },
  { guion: "astrofisica/01-kepler-tercera-ley", a: 6, prueba: "Exponente que cambia de rol: T² de denominador a factor" },
  { guion: "astrofisica/01-kepler-tercera-ley", a: 7, prueba: "Término desde un denominador: fracción GM/r al otro lado" },
  { guion: "astrofisica/01-kepler-tercera-ley", a: 8, prueba: "Potencias que se reúnen (r² · r → r³), rayas de fracción" },
  { guion: "fisica/01-caida-desde-reposo", a: 2, prueba: "Cancelación de la masa con \\id" },
  { guion: "fisica/01-caida-desde-reposo", a: 3, prueba: "Términos repetidos: referencia 2#1" },
  { guion: "bordes/03-paquete-physics", a: 2, prueba: "Paréntesis que desaparecen (\\qty, paquete physics)" },
  { guion: "bordes/03-paquete-physics", a: 3, prueba: "Derivada de Leibniz (\\dv) y pasar v₀" },
  { guion: "bordes/04-contraer-en-mvp", a: 2, prueba: "Contracción con la delta (W02: transición automática)" },
  { guion: "bordes/04-contraer-en-mvp", a: 3, prueba: "Renombre de índice mudo μ → α" },
  { guion: "bordes/05-indices-simetricos", a: 2, prueba: "Intercambiar índices con posición y aparición (_\\nu#2)" },
  { guion: "bordes/05-indices-simetricos", a: 3, prueba: "Sumar términos iguales sin acciones (coeficiente 2 aparece)" },
  { guion: "cuantica/01-conmutador-posicion-momento", a: 2, prueba: "Conmutador \\comm con sustitución de x̂" },
  { guion: "cuantica/01-conmutador-posicion-momento", a: 3, prueba: "Momento como derivada: d/dx y paréntesis ajustados" },
  { guion: "cuantica/01-conmutador-posicion-momento", a: 6, prueba: "Cancelar dos términos marcados con \\id" },
  { guion: "cuantica/01-conmutador-posicion-momento", a: 8, prueba: "Orden de operadores: intercambiar x̂ y p̂" },
  { guion: "cuantica/02-anticonmutador-pauli", a: 2, prueba: "Anticonmutador \\acomm y llaves ajustadas, en el lugar" },
  { guion: "cuantica/02-anticonmutador-pauli", a: 4, prueba: "Cancelar en el lugar con \\id" },
  { guion: "cuantica/03-valor-esperado-braket", a: 2, prueba: "Valor esperado y Dirac: \\expval, \\braket con \\middle, suma" },
  { guion: "cuantica/04-pozo-infinito", a: 2, prueba: "Ambos lados por una fracción con paréntesis; derivada de Leibniz" },
  { guion: "relatividad/01-energia-momento", a: 2, prueba: "Bajar un índice con la métrica (W02: transición automática)" },
  { guion: "relatividad/01-energia-momento", a: 7, prueba: "Términos repetidos: pasar c^2#2" },
  { guion: "relatividad/02-derivada-covariante", a: 3, prueba: "Índices escalonados (\\tensor) y renombrar λ en varios términos" },
  { guion: "relatividad/02-derivada-covariante", a: 4, prueba: "Renombrar μ solo en un término (referencia t3)" },
  { guion: "relatividad/04-dilatacion-tiempo", a: 7, prueba: "Raíz que pasa dividiendo; fracciones anidadas" },
];

/** Lee un guion: del corpus o de un ejemplo de la especificación (sección 10). */
function leerGuion(nombre) {
  if (nombre.startsWith("spec ")) {
    const spec = readFileSync(resolve(RAIZ, "docs/spec/tiza-formato.md"), "utf8");
    const i = spec.indexOf("### " + nombre.slice(5));
    if (i < 0) throw new Error(`no encuentro el ejemplo ${nombre}`);
    const a = spec.indexOf("```markdown\n", i) + 12;
    const b = spec.indexOf("\n```", a);
    return spec.slice(a, b) + "\n";
  }
  return readFileSync(resolve(RAIZ, "corpus", nombre + ".tiza"), "utf8");
}

/** Títulos de los pasos, en orden (un paso empieza en cada línea «##»). */
function titulos(src) {
  const lineas = src.split("\n");
  let i = 0;
  if (lineas[0].trim() === "---") {
    i = 1;
    while (i < lineas.length && lineas[i].trim() !== "---") i++;
    i++;
  }
  const out = [];
  for (; i < lineas.length; i++) if (/^##(\s|$)/.test(lineas[i])) out.push(lineas[i].slice(2).trim());
  return out;
}

function tituloGuion(src) {
  const m = src.match(/^titulo:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

const guiones = {};
for (const p of PARES) guiones[p.guion] ??= leerGuion(p.guion);

const pares = PARES.map((p, i) => {
  const t = titulos(guiones[p.guion]);
  if (p.a < 2 || p.a > t.length) throw new Error(`par ${i + 1}: ${p.guion} tiene ${t.length} pasos; a = ${p.a} no sirve`);
  return {
    id: String(i + 1).padStart(2, "0"),
    guion: p.guion,
    a: p.a,
    desde: t[p.a - 2] || "(sin título)",
    hacia: t[p.a - 1] || "(sin título)",
    prueba: p.prueba,
  };
});
if (pares.length !== 30) throw new Error(`se esperan 30 pares y hay ${pares.length}`);

// --- bloque para index.html (JSON con «<» escapado para que no cierre el <script>)
const json = (v) => JSON.stringify(v, null, 0).replace(/</g, "\\u003c");
const bloque =
  "/* <evaluacion:generado> — no editar a mano: node apps/prototipo/evaluacion/generar-pares.mjs */\n" +
  "const EVAL_GUIONES = {\n" +
  Object.entries(guiones)
    .map(([k, v]) => `  ${json(k)}: ${json(v)}`)
    .join(",\n") +
  "\n};\n" +
  "const EVAL_PARES = [\n" +
  pares.map((p) => "  " + json(p)).join(",\n") +
  "\n];\n" +
  "/* </evaluacion:generado> */";

const html = readFileSync(HTML, "utf8");
const ini = html.indexOf("/* <evaluacion:generado>");
const finMarca = "/* </evaluacion:generado> */";
const fin = html.indexOf(finMarca);
if (ini < 0 || fin < 0) throw new Error("index.html no tiene las marcas <evaluacion:generado>");
const htmlNuevo = html.slice(0, ini) + bloque + html.slice(fin + finMarca.length);

// --- pares.md
const celda = (s) => s.replace(/\|/g, "\\|");
const enlace = (g) => (g.startsWith("spec ") ? `especificación ${g.slice(5)}` : `[\`${g}\`](../../../corpus/${g}.tiza)`);
const md =
  "# Pares de prueba del modo evaluación\n\n" +
  "Treinta transiciones para el criterio de salida de F0: **80 % de aciertos** en el emparejamiento (issue #12). " +
  "Cada par es el paso de `a − 1` a `a` de un guion del corpus o de un ejemplo de la especificación. " +
  "En el prototipo se cargan desde el selector **Par** del panel de evaluación.\n\n" +
  "Archivo generado por `generar-pares.mjs`; para cambiar la lista, edita `PARES` en ese archivo y vuelve a correrlo.\n\n" +
  "| Par | Guion | Transición | Qué pone a prueba |\n| --- | --- | --- | --- |\n" +
  pares
    .map(
      (p) =>
        `| ${p.id} | ${enlace(p.guion)} — ${celda(tituloGuion(guiones[p.guion]))} | ${p.a - 1} → ${p.a}: ${celda(p.desde)} → ${celda(p.hacia)} | ${celda(p.prueba)} |`,
    )
    .join("\n") +
  "\n\n## Cobertura\n\n" +
  "Cubre los casos de la matriz mínima de la especificación (sección 11) que tienen guion en el corpus, " +
  "incluidas cuántica (conmutador, anticonmutador, Dirac) y relatividad (índices escalonados, bajar, contraer, renombrar). Quedan fuera:\n\n" +
  "- **Integral definida** y **vectores y unidades** como caso propio: el corpus aún no tiene un guion con integral (W2).\n" +
  "- **Guion con error deliberado** (`bordes/02-left-sin-right.tiza`): no compila, así que no tiene transiciones que evaluar.\n" +
  "- `bordes/01-paso-no-equivalente.tiza`: pone a prueba el verificador, no el emparejamiento.\n";

if (process.argv.includes("--revisar")) {
  const mdActual = readFileSync(MD, "utf8");
  if (html !== htmlNuevo || mdActual !== md) {
    console.error("✗ pares desactualizados: corre node apps/prototipo/evaluacion/generar-pares.mjs");
    process.exit(1);
  }
  console.log("✓ pares al día");
} else {
  writeFileSync(HTML, htmlNuevo);
  writeFileSync(MD, md);
  for (const p of pares) console.log(`${p.id}  ${p.guion}  ${p.a - 1}→${p.a}  ${p.desde} → ${p.hacia}`);
}
