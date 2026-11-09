/**
 * Tipos del contrato C2 (`esquemas/paso-compilado.schema.json`, ADR 0003) y de los
 * diagnósticos del validador (sección 8 de la especificación).
 *
 * Estos tipos reflejan el esquema; no lo reemplazan. Si cambia el esquema, cambian aquí.
 */

export type Formato = "tiza/0.1" | "tiza/0.2";
export type Tema = "pizarron-verde" | "pizarron-negro" | "pizarra-blanca" | "transparente";
export type Pizarra = "lineas" | "en-lugar";
export type Alinear = "=" | "\\approx" | "<" | ">" | "\\le" | "\\ge" | "ninguna";
export type Idioma = "es" | "en";
export type Paquete = "physics";
export type Lado = "izq" | "der";
export type Modo = "nueva-linea" | "en-lugar";
export type Posicion = "previa" | "posterior";

export interface Supuestos {
  positivos: string[];
  reales: string[];
  "no-nulos": string[];
}

/** Encabezado normalizado, con los valores por omisión de la sección 3 ya aplicados. */
export interface Encabezado {
  formato: Formato;
  titulo: string;
  curso?: string;
  etiquetas: string[];
  tema: Tema;
  ritmo: number;
  pizarra: Pizarra;
  alinear: Alinear;
  idioma: Idioma;
  paquetes: Paquete[];
  macros: string;
  supuestos: Supuestos;
}

export type Accion =
  | { verbo: "pasar"; objetivos: [string]; lado: Lado }
  | { verbo: "cancelar" | "resaltar"; objetivos: string[] }
  | { verbo: "borrar"; objetivos: string[] }
  | { verbo: "expandir" | "simplificar" | "recuadro"; objetivos: [] | [string] }
  | { verbo: "bajar" | "subir" | "factorizar"; objetivos: [string] }
  | { verbo: "contraer" | "intercambiar" | "flecha"; objetivos: [string, string] }
  | { verbo: "pausa"; segundos: number }
  | { verbo: "renombrar"; de: string; a: string; objetivos: [] | [string] }
  | { verbo: "sustituir"; de: string; a: string }
  | { verbo: "ambos-lados"; tex: string }
  | { verbo: "derivar"; variable: string }
  | { verbo: "integrar"; variable: string; desde?: string; hasta?: string }
  | { verbo: "aproximar"; texto: string }
  | { verbo: "nota"; texto: string; lado: Lado }
  | { verbo: "llave"; objetivos: [string]; texto: string }
  | { verbo: "columna" };

export type Verbo = Accion["verbo"];

export interface Compas {
  posicion: Posicion;
  linea: number;
  acciones: Accion[];
}

export interface PasoCompilado {
  id: string;
  titulo: string;
  latex: string | null;
  modo: Modo;
  ids: string[];
  compases: Compas[];
  narracion: string;
  linea: number;
}

/** Raíz del contrato C2. */
export interface GuionCompilado extends Encabezado {
  pasos: PasoCompilado[];
}

/** Códigos de la sección 8. W00 (línea fuera de la gramática) viene del prototipo. */
export type CodigoError =
  "E01" | "E02" | "E03" | "E04" | "E06" | "E07" | "E08" | "E11" | "E12" | "E13";
export type CodigoAdvertencia = "W00" | "W01" | "W02" | "W03" | "W04" | "W05" | "W08";
export type Codigo = CodigoError | CodigoAdvertencia;

export interface Diagnostico {
  codigo: Codigo;
  nivel: "error" | "advertencia";
  mensaje: string;
  /** Línea del archivo fuente, desde 1. */
  linea: number;
  /** Columna, desde 1. */
  columna: number;
}

/** Bloque `prueba` del encabezado (sección 11). Se ignora en producción. */
export interface Prueba {
  objetivo?: string;
  cubre?: string[];
  esperado?: string;
}

export interface ResultadoAnalisis {
  /** Encabezado normalizado; `null` si faltan `formato` o `titulo` válidos. */
  encabezado: Encabezado | null;
  pasos: PasoCompilado[];
  diagnosticos: Diagnostico[];
  prueba: Prueba | null;
}
