#!/usr/bin/env node
/**
 * CLI de Tiza.
 *
 *   tiza validar <archivos o carpetas…> [--json] [--esperado]
 *
 * - Las carpetas se recorren buscando archivos `.tiza`.
 * - Sin `--esperado`, sale con código 1 si algún guion tiene errores.
 * - Con `--esperado`, compara cada guion con el `esperado` de su bloque `prueba` y sale con
 *   código 1 si alguno no cumple (un guion con `esperado: error:E13` debe tener E13).
 * - `--json` escribe un arreglo con un objeto por archivo en vez del texto legible.
 */

import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { analizar } from "./analizador.ts";
import { cumpleEsperado, leerEsperado } from "./esperado.ts";
import type { Diagnostico } from "./tipos.ts";

export interface ResultadoArchivo {
  archivo: string;
  diagnosticos: Diagnostico[];
  errores: number;
  advertencias: number;
  esperado?: string;
  cumple?: boolean;
  motivo?: string;
}

/** Lista los `.tiza` de las rutas (archivos tal cual; carpetas, recursivas y ordenadas). */
export function listarGuiones(rutas: readonly string[]): string[] {
  const salida: string[] = [];
  const recorrer = (ruta: string): void => {
    if (statSync(ruta).isDirectory()) {
      for (const nombre of readdirSync(ruta).sort()) {
        const hija = join(ruta, nombre);
        if (statSync(hija).isDirectory() || nombre.endsWith(".tiza")) recorrer(hija);
      }
    } else {
      salida.push(ruta);
    }
  };
  for (const r of rutas) recorrer(r);
  return salida;
}

/** Valida un archivo; con `conEsperado`, también lo compara con su bloque `prueba`. */
export function validarArchivo(archivo: string, conEsperado: boolean): ResultadoArchivo {
  const r = analizar(readFileSync(archivo, "utf8"));
  const res: ResultadoArchivo = {
    archivo,
    diagnosticos: r.diagnosticos,
    errores: r.diagnosticos.filter((d) => d.nivel === "error").length,
    advertencias: r.diagnosticos.filter((d) => d.nivel === "advertencia").length,
  };
  if (conEsperado) {
    const texto = r.prueba?.esperado;
    const esperado = texto === undefined ? null : leerEsperado(texto);
    if (texto !== undefined) res.esperado = texto;
    if (!esperado) {
      res.cumple = false;
      res.motivo =
        texto === undefined
          ? "falta prueba.esperado en el encabezado"
          : `esperado ilegible «${texto}»`;
    } else {
      const c = cumpleEsperado(esperado, r.diagnosticos);
      res.cumple = c.cumple;
      if (!c.cumple) res.motivo = c.motivo;
    }
  }
  return res;
}

/** Texto legible: `archivo:línea:columna  nivel  código  mensaje`. */
export function formatear(resultados: readonly ResultadoArchivo[], base = process.cwd()): string {
  const lineas: string[] = [];
  for (const r of resultados) {
    const nombre = relative(base, r.archivo) || r.archivo;
    const marca =
      r.cumple === undefined
        ? ""
        : r.cumple
          ? "  ✓ " + (r.esperado ?? "")
          : "  ✗ " + (r.motivo ?? "");
    lineas.push(`${nombre}: ${r.errores} errores, ${r.advertencias} advertencias${marca}`);
    for (const d of r.diagnosticos) {
      lineas.push(`  ${nombre}:${d.linea}:${d.columna}  ${d.nivel}  ${d.codigo}  ${d.mensaje}`);
    }
  }
  return lineas.join("\n");
}

const AYUDA = `Uso: tiza validar <archivos o carpetas…> [--json] [--esperado]

  --json       salida en JSON (un objeto por archivo)
  --esperado   compara con prueba.esperado del encabezado (para el corpus)`;

/** Punto de entrada. Devuelve el código de salida. */
export function principal(argv: readonly string[], escribir: (s: string) => void): number {
  const [orden, ...resto] = argv;
  if (orden !== "validar") {
    escribir(AYUDA);
    return orden === "--help" || orden === "-h" ? 0 : 2;
  }
  const json = resto.includes("--json");
  const conEsperado = resto.includes("--esperado");
  const desconocidas = resto.filter(
    (a) => a.startsWith("--") && a !== "--json" && a !== "--esperado",
  );
  const rutas = resto.filter((a) => !a.startsWith("--"));
  if (desconocidas.length > 0 || rutas.length === 0) {
    escribir(AYUDA);
    return 2;
  }
  let archivos: string[];
  try {
    archivos = listarGuiones(rutas);
  } catch (e) {
    escribir(`No se puede leer: ${(e as Error).message}`);
    return 2;
  }
  const resultados = archivos.map((a) => validarArchivo(a, conEsperado));
  escribir(json ? JSON.stringify(resultados, null, 2) : formatear(resultados));
  const falla = conEsperado
    ? resultados.some((r) => !r.cumple)
    : resultados.some((r) => r.errores > 0);
  if (!json) {
    const malos = resultados.filter((r) => (conEsperado ? !r.cumple : r.errores > 0)).length;
    escribir(
      `\n${resultados.length} guiones; ${malos} ${conEsperado ? "no cumplen lo esperado" : "con errores"}.`,
    );
  }
  return falla ? 1 : 0;
}

const ejecutadoDirecto =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (ejecutadoDirecto) {
  process.exitCode = principal(process.argv.slice(2), (s) => process.stdout.write(s + "\n"));
}
