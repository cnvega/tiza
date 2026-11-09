/**
 * Líneas de acción `::` (secciones 4, 6 y 7 de la especificación): fichas, compás con ` + `,
 * firma de cada verbo (E08) y forma de las referencias.
 */

import type { Accion, Lado, Posicion, Verbo } from "./tipos.ts";

/** Verbos de la sección 7, más `en-lugar` y `nueva-linea`, que se resuelven en `modo`. */
export const VERBOS = [
  "pasar",
  "cancelar",
  "resaltar",
  "borrar",
  "pausa",
  "en-lugar",
  "nueva-linea",
  "renombrar",
  "contraer",
  "bajar",
  "subir",
  "intercambiar",
  "sustituir",
  "expandir",
  "factorizar",
  "simplificar",
  "ambos-lados",
  "derivar",
  "integrar",
  "aproximar",
  "nota",
  "llave",
  "flecha",
  "recuadro",
  "columna",
] as const;

export type VerboFuente = (typeof VERBOS)[number];

/** Acciones de transformación: no pueden ir antes de la fórmula del primer paso (E12). */
export const VERBOS_TRANSFORMACION: ReadonlySet<VerboFuente> = new Set([
  "pasar",
  "cancelar",
  "sustituir",
  "expandir",
  "factorizar",
  "simplificar",
  "ambos-lados",
  "derivar",
  "integrar",
]);

/** Columna «Posición» de la sección 7. */
const POSICION: Readonly<Record<VerboFuente, Posicion | "cualquiera">> = {
  pasar: "previa",
  cancelar: "previa",
  resaltar: "cualquiera",
  borrar: "previa",
  pausa: "cualquiera",
  "en-lugar": "previa",
  "nueva-linea": "previa",
  renombrar: "previa",
  contraer: "previa",
  bajar: "previa",
  subir: "previa",
  intercambiar: "previa",
  sustituir: "previa",
  expandir: "previa",
  factorizar: "previa",
  simplificar: "previa",
  "ambos-lados": "previa",
  derivar: "previa",
  integrar: "previa",
  aproximar: "previa",
  nota: "cualquiera",
  llave: "posterior",
  flecha: "cualquiera",
  recuadro: "posterior",
  columna: "previa",
};

/** Marcas que puede llevar un paso sin fórmula (sección 4). */
export const VERBOS_SIN_FORMULA: ReadonlySet<VerboFuente> = new Set([
  "resaltar",
  "nota",
  "flecha",
  "llave",
  "recuadro",
  "pausa",
]);

/**
 * Verbos de entrega MVP (columna «Entrega» de la sección 7): los que el motor implementa por
 * omisión. El resto (v1.0) da W02. El prototipo F0 implementa además `recuadro`; quien lo
 * necesite pasa su propio conjunto en `OpcionesAnalisis.implementados`.
 */
export const VERBOS_IMPLEMENTADOS: ReadonlySet<VerboFuente> = new Set([
  "pasar",
  "cancelar",
  "resaltar",
  "borrar",
  "pausa",
  "en-lugar",
  "nueva-linea",
  "renombrar",
  "intercambiar",
]);

/** Verbos que toman el resto de la línea como LaTeX (no se parten en ` + `). */
const RESTO_DE_LINEA: ReadonlySet<VerboFuente> = new Set(["sustituir", "ambos-lados"]);

export function esVerbo(v: string): v is VerboFuente {
  return (VERBOS as readonly string[]).includes(v);
}

export interface Argumento {
  tipo: "ficha" | "tex" | "cadena";
  valor: string;
  /** Columna en la línea, desde 0. */
  col: number;
}

export interface ProblemaAccion {
  codigo: "E08";
  mensaje: string;
  /** Columna en la línea, desde 0. */
  col: number;
}

/** Acción leída de la fuente: `en-lugar` y `nueva-linea` todavía son acciones aquí. */
export type AccionFuente =
  | { verbo: "en-lugar" | "nueva-linea"; col: number }
  | { verbo: Verbo; accion: Accion; col: number };

/**
 * Divide en argumentos: `"cadena"`, `{tex}` o fichas sin espacios (las llaves internas
 * protegen espacios: `\frac{a b}{c}` es una ficha). Un `#n` pegado a `{…}` queda en la ficha.
 */
export function dividirArgumentos(
  texto: string,
  desde: number,
): { args: Argumento[]; problema: ProblemaAccion | null } {
  const args: Argumento[] = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto.charAt(i);
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === '"') {
      const fin = texto.indexOf('"', i + 1);
      if (fin < 0) {
        return {
          args,
          problema: { codigo: "E08", mensaje: "Cadena sin comillas de cierre", col: desde + i },
        };
      }
      args.push({ tipo: "cadena", valor: texto.slice(i + 1, fin), col: desde + i });
      i = fin + 1;
      continue;
    }
    let j = i;
    let profundidad = 0;
    for (; j < texto.length; j++) {
      const d = texto.charAt(j);
      if (d === "\\") {
        j++;
        continue;
      }
      if (d === "{") profundidad++;
      else if (d === "}") profundidad--;
      else if ((d === " " || d === "\t") && profundidad === 0) break;
    }
    if (profundidad > 0) {
      return {
        args,
        problema: { codigo: "E08", mensaje: "Llave sin cerrar en el argumento", col: desde + i },
      };
    }
    const crudo = texto.slice(i, j);
    if (c === "{" && cierraAlFinal(crudo)) {
      args.push({ tipo: "tex", valor: crudo.slice(1, -1), col: desde + i });
    } else {
      args.push({ tipo: "ficha", valor: crudo, col: desde + i });
    }
    i = j;
  }
  return { args, problema: null };
}

/** ¿La llave que abre en 0 cierra justo al final? */
function cierraAlFinal(s: string): boolean {
  let profundidad = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s.charAt(k);
    if (c === "\\") {
      k++;
      continue;
    }
    if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return k === s.length - 1;
    }
  }
  return false;
}

/**
 * Parte el texto de una línea `::` (sin el `::`) en acciones unidas por ` + ` fuera de llaves.
 * `sustituir` y `ambos-lados` se quedan con el resto de la línea. Devuelve cada trozo con su
 * columna de inicio relativa a `texto`.
 */
export function partirCompas(texto: string): { trozo: string; col: number }[] {
  const trozos: { trozo: string; col: number }[] = [];
  let inicio = 0;
  let profundidad = 0;
  const verboEn = (k: number): string => /^\s*([a-z-]+)/.exec(texto.slice(k))?.[1] ?? "";
  let restoDeLinea = RESTO_DE_LINEA.has(verboEn(0) as VerboFuente);
  for (let i = 0; i < texto.length && !restoDeLinea; i++) {
    const c = texto.charAt(i);
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "{") profundidad++;
    else if (c === "}") profundidad--;
    else if (profundidad === 0 && texto.startsWith(" + ", i)) {
      trozos.push({ trozo: texto.slice(inicio, i), col: inicio });
      inicio = i + 3;
      i += 2;
      restoDeLinea = RESTO_DE_LINEA.has(verboEn(inicio) as VerboFuente);
    }
  }
  trozos.push({ trozo: texto.slice(inicio), col: inicio });
  return trozos
    .map(({ trozo, col }) => {
      const sinIzq = trozo.trimStart();
      return { trozo: sinIzq.trimEnd(), col: col + (trozo.length - sinIzq.length) };
    })
    .filter((t) => t.trozo.length > 0);
}

/** Forma de una referencia (sección 6): `ms`, `T^2`, `r#2`, `^\mu`, `_\nu#2`, `{a b}#2`. */
export function referenciaValida(ref: string): boolean {
  if (!ref.trim()) return false;
  const aparicion = /#([^#]*)$/.exec(ref);
  if (aparicion) {
    if (!/^[1-9][0-9]*$/.test(aparicion[1] ?? "")) return false;
    const cuerpo = ref.slice(0, aparicion.index);
    if (!cuerpo || cuerpo === "^" || cuerpo === "_") return false;
  }
  return ref !== "^" && ref !== "_";
}

const esLado = (v: string): v is Lado => v === "izq" || v === "der";

/**
 * Lee una acción (`verbo argumentos…`) que empieza en la columna `col` de su línea.
 * Devuelve la acción o un problema E08.
 */
export function leerAccion(
  texto: string,
  col: number,
): { accion: AccionFuente; problema: null } | { accion: null; problema: ProblemaAccion } {
  const m = /^([^\s]+)\s*(.*)$/.exec(texto);
  const verbo = m?.[1] ?? "";
  const resto = m?.[2] ?? "";
  const colResto = col + texto.length - resto.length;
  const mal = (mensaje: string, c = col) =>
    ({ accion: null, problema: { codigo: "E08", mensaje, col: c } }) as const;

  if (!esVerbo(verbo)) return mal(`Verbo desconocido «${verbo}»`);

  if (verbo === "sustituir") {
    const k = primerIgual(resto);
    const de = k < 0 ? "" : resto.slice(0, k).trim();
    const a = k < 0 ? "" : resto.slice(k + 1).trim();
    if (!de || !a) return mal("sustituir necesita «TEX = TEX»", colResto);
    return ok({ verbo, de, a }, col);
  }
  if (verbo === "ambos-lados") {
    const tex = resto.trim();
    if (!tex) return mal("ambos-lados necesita la operación en LaTeX", colResto);
    return ok({ verbo, tex }, col);
  }

  const { args, problema } = dividirArgumentos(resto, colResto);
  if (problema) return { accion: null, problema };
  const cadenas = args.filter((a) => a.tipo === "cadena");
  const noCadenas = args.filter((a) => a.tipo !== "cadena");
  const refs = (lista: Argumento[]): string[] | ProblemaAccion => {
    for (const a of lista) {
      if (a.tipo === "cadena" || !referenciaValida(a.valor)) {
        return { codigo: "E08", mensaje: `Referencia mal formada «${a.valor}»`, col: a.col };
      }
    }
    return lista.map((a) => a.valor);
  };
  const conRefs = (lista: Argumento[], f: (r: string[]) => Accion) => {
    const r = refs(lista);
    return Array.isArray(r) ? ok(f(r), col) : ({ accion: null, problema: r } as const);
  };
  const cuantos = (min: number, max: number, firma: string) =>
    args.length < min || args.length > max ? mal(`${verbo} espera «${firma}»`) : null;

  switch (verbo) {
    case "en-lugar":
    case "nueva-linea":
    case "columna": {
      const e = cuantos(0, 0, verbo);
      if (e) return e;
      return verbo === "columna" ? ok({ verbo }, col) : { accion: { verbo, col }, problema: null };
    }
    case "pasar": {
      const e = cuantos(2, 2, "pasar REF izq|der");
      if (e) return e;
      const [ref, lado] = args as [Argumento, Argumento];
      if (lado.tipo !== "ficha" || !esLado(lado.valor)) {
        return mal("pasar espera «pasar REF izq|der»", lado.col);
      }
      return conRefs([ref], ([r]) => ({ verbo, objetivos: [r ?? ""], lado: lado.valor as Lado }));
    }
    case "cancelar":
    case "resaltar":
      return (
        cuantos(1, Infinity, `${verbo} REF…`) ?? conRefs(args, (r) => ({ verbo, objetivos: r }))
      );
    case "borrar":
      return conRefs(args, (r) => ({ verbo, objetivos: r }));
    case "expandir":
    case "simplificar":
    case "recuadro":
      return (
        cuantos(0, 1, `${verbo} [REF]`) ??
        conRefs(args, (r) => ({ verbo, objetivos: r as [] | [string] }))
      );
    case "bajar":
    case "subir":
    case "factorizar":
      return (
        cuantos(1, 1, `${verbo} REF`) ?? conRefs(args, (r) => ({ verbo, objetivos: r as [string] }))
      );
    case "contraer":
    case "intercambiar":
    case "flecha":
      return (
        cuantos(2, 2, `${verbo} REF REF`) ??
        conRefs(args, (r) => ({ verbo, objetivos: r as [string, string] }))
      );
    case "pausa": {
      const e = cuantos(1, 1, "pausa NUM");
      if (e) return e;
      const a = args[0] as Argumento;
      const segundos = Number(a.valor);
      if (a.tipo !== "ficha" || !/^[0-9]+(\.[0-9]+)?$/.test(a.valor) || !(segundos > 0)) {
        return mal("pausa espera un número de segundos mayor que 0, con punto decimal", a.col);
      }
      return ok({ verbo, segundos }, col);
    }
    case "renombrar": {
      const e = cuantos(2, 3, "renombrar TEX TEX [REF]");
      if (e) return e;
      const [de, a, ...ref] = args as [Argumento, Argumento, ...Argumento[]];
      if (de.tipo === "cadena" || a.tipo === "cadena" || !de.valor.trim() || !a.valor.trim()) {
        return mal("renombrar espera «renombrar TEX TEX [REF]»");
      }
      return conRefs(ref, (r) => ({
        verbo,
        de: de.valor,
        a: a.valor,
        objetivos: r as [] | [string],
      }));
    }
    case "derivar": {
      const e = cuantos(1, 1, "derivar VAR");
      if (e) return e;
      const v = args[0] as Argumento;
      if (v.tipo === "cadena" || !v.valor.trim()) return mal("derivar espera «derivar VAR»", v.col);
      return ok({ verbo, variable: v.valor }, col);
    }
    case "integrar": {
      if (args.length !== 1 && args.length !== 3) {
        return mal("integrar espera «integrar VAR [TEX TEX]»");
      }
      if (args.some((a) => a.tipo === "cadena" || !a.valor.trim())) {
        return mal("integrar espera «integrar VAR [TEX TEX]»");
      }
      const [v, desde, hasta] = args as [Argumento, Argumento?, Argumento?];
      return ok(
        desde && hasta
          ? { verbo, variable: v.valor, desde: desde.valor, hasta: hasta.valor }
          : { verbo, variable: v.valor },
        col,
      );
    }
    case "aproximar": {
      if (args.length !== 1 || cadenas.length !== 1) {
        return mal('aproximar espera «aproximar "…"»');
      }
      return ok({ verbo, texto: cadenas[0]?.valor ?? "" }, col);
    }
    case "nota": {
      const lado = noCadenas[0];
      if (
        cadenas.length !== 1 ||
        args[0]?.tipo !== "cadena" ||
        noCadenas.length > 1 ||
        (lado && (lado.tipo !== "ficha" || !esLado(lado.valor)))
      ) {
        return mal('nota espera «nota "…" [izq|der]»');
      }
      return ok(
        { verbo, texto: cadenas[0]?.valor ?? "", lado: (lado?.valor as Lado) ?? "der" },
        col,
      );
    }
    case "llave": {
      const [ref, texto] = args;
      if (args.length !== 2 || !ref || ref.tipo === "cadena" || texto?.tipo !== "cadena") {
        return mal('llave espera «llave REF "…"»');
      }
      return conRefs([ref], ([r]) => ({ verbo, objetivos: [r ?? ""], texto: texto.valor }));
    }
  }
}

function ok(accion: Accion, col: number) {
  return { accion: { verbo: accion.verbo, accion, col }, problema: null } as const;
}

/** Posición del primer `=` fuera de llaves, o -1. */
function primerIgual(s: string): number {
  let profundidad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "{") profundidad++;
    else if (c === "}") profundidad--;
    else if (c === "=" && profundidad === 0) return i;
  }
  return -1;
}

/** ¿Puede ir `verbo` en esta posición? */
export function posicionAdmitida(verbo: VerboFuente, posicion: Posicion): boolean {
  const p = POSICION[verbo];
  return p === "cualquiera" || p === posicion;
}
