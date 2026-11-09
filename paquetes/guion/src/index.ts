/**
 * Paquete `guion`: analizador y validador de guiones `.tiza`.
 *
 * Por ahora solo expone la versión del formato que admite; el analizador
 * llega con el issue de W1.
 */

/** Versiones del formato `.tiza` que este paquete acepta (sección 3 de la especificación). */
export const FORMATOS_ADMITIDOS = ["tiza/0.1", "tiza/0.2"] as const;

export type Formato = (typeof FORMATOS_ADMITIDOS)[number];

/** Indica si `valor` es una versión de formato admitida. */
export function esFormatoAdmitido(valor: string): valor is Formato {
  return (FORMATOS_ADMITIDOS as readonly string[]).includes(valor);
}
