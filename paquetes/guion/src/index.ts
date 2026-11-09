/**
 * Paquete `guion`: analizador y validador de guiones `.tiza` (contrato C1 → C2).
 */

export { analizar, compilar, type OpcionesAnalisis } from "./analizador.ts";
export { cumpleEsperado, leerEsperado, type Esperado } from "./esperado.ts";
export {
  VERBOS,
  VERBOS_IMPLEMENTADOS,
  VERBOS_SIN_FORMULA,
  VERBOS_TRANSFORMACION,
  type VerboFuente,
} from "./acciones.ts";
export {
  MACROS_TIZA,
  estimarGlifos,
  expandirMacrosTiza,
  expandirTensor,
  extraerIds,
  extraerSimbolos,
  preprocesar,
  quitarIds,
  type OpcionesPreproceso,
} from "./latex.ts";
export type * from "./tipos.ts";

/** Versiones del formato `.tiza` que este paquete acepta (sección 3 de la especificación). */
export const FORMATOS_ADMITIDOS = ["tiza/0.1", "tiza/0.2"] as const;

/** Indica si `valor` es una versión de formato admitida. */
export function esFormatoAdmitido(valor: string): valor is (typeof FORMATOS_ADMITIDOS)[number] {
  return (FORMATOS_ADMITIDOS as readonly string[]).includes(valor);
}
