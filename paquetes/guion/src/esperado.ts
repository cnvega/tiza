/**
 * Comparación con el `esperado` del bloque `prueba` (sección 11 de la especificación).
 *
 * - `ok`: sin errores (puede haber advertencias, como W02 por un gesto de la v1.0).
 * - `advertencia:Wnn`: sin errores y con al menos una Wnn (puede haber otras advertencias).
 * - `error:Enn`: con al menos un Enn (puede haber otros diagnósticos).
 */

import type { Diagnostico } from "./tipos.ts";

export type Esperado =
  { tipo: "ok" } | { tipo: "advertencia"; codigo: string } | { tipo: "error"; codigo: string };

/** Lee `ok`, `advertencia:W02` o `error:E13`. Devuelve `null` si no calza. */
export function leerEsperado(texto: string): Esperado | null {
  const t = texto.trim();
  if (t === "ok") return { tipo: "ok" };
  const m = /^(advertencia|error):\s*([EW][0-9]{2})$/.exec(t);
  if (!m) return null;
  const [, tipo, codigo] = m;
  if (tipo === "advertencia" && codigo?.startsWith("W")) return { tipo, codigo };
  if (tipo === "error" && codigo?.startsWith("E")) return { tipo, codigo };
  return null;
}

/** Indica si los diagnósticos cumplen lo esperado y, si no, por qué. */
export function cumpleEsperado(
  esperado: Esperado,
  diagnosticos: readonly Diagnostico[],
): { cumple: boolean; motivo: string } {
  const errores = diagnosticos.filter((d) => d.nivel === "error");
  const codigos = (lista: readonly Diagnostico[]) =>
    [...new Set(lista.map((d) => d.codigo))].join(", ");
  switch (esperado.tipo) {
    case "ok":
      return errores.length === 0
        ? { cumple: true, motivo: "" }
        : { cumple: false, motivo: `se esperaba ok y hay ${codigos(errores)}` };
    case "advertencia":
      if (errores.length > 0) {
        return {
          cumple: false,
          motivo: `se esperaba ${esperado.codigo} sin errores y hay ${codigos(errores)}`,
        };
      }
      return diagnosticos.some((d) => d.codigo === esperado.codigo)
        ? { cumple: true, motivo: "" }
        : { cumple: false, motivo: `falta la advertencia ${esperado.codigo}` };
    case "error":
      return errores.some((d) => d.codigo === esperado.codigo)
        ? { cumple: true, motivo: "" }
        : { cumple: false, motivo: `falta el error ${esperado.codigo}` };
  }
}
