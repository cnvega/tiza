/**
 * Analizador y validador de guiones `.tiza` (C1 → C2). Punto de partida: `parseTiza` del
 * prototipo (`apps/prototipo/index.html`), llevado a TypeScript estricto.
 *
 * Valida lo que no necesita componer LaTeX: E01–E04, E06–E08, E11–E13, W01–W05 y W08.
 * E05, E09 y E10 (composición y referencias contra glifos) quedan para `tipografia` (W3).
 */

import { isMap, isScalar, LineCounter, parseDocument, type Document } from "yaml";
import {
  leerAccion,
  partirCompas,
  posicionAdmitida,
  VERBOS_IMPLEMENTADOS,
  VERBOS_SIN_FORMULA,
  VERBOS_TRANSFORMACION,
  type AccionFuente,
  type VerboFuente,
} from "./acciones.ts";
import {
  construccionesNoAdmitidas,
  delimitadoresSinPareja,
  estimarGlifos,
  extraerIds,
  extraerSimbolos,
  LARGO_MAXIMO_ID,
  normalizarSimbolo,
  PATRON_ID,
} from "./latex.ts";
import type {
  Alinear,
  Codigo,
  Compas,
  Diagnostico,
  Encabezado,
  Formato,
  GuionCompilado,
  Idioma,
  Modo,
  Paquete,
  PasoCompilado,
  Pizarra,
  Posicion,
  Prueba,
  ResultadoAnalisis,
  Supuestos,
  Tema,
} from "./tipos.ts";

export interface OpcionesAnalisis {
  /** Verbos que el motor implementa; el resto da W02. Por omisión, los de entrega MVP (sección 7). */
  implementados?: ReadonlySet<string>;
  /** Límite de glifos por paso para W03 (por omisión 60). */
  maxGlifos?: number;
  /** Límite de pasos para W04 (por omisión 12). */
  maxPasos?: number;
}

const FORMATOS: readonly Formato[] = ["tiza/0.1", "tiza/0.2"];
const TEMAS: readonly Tema[] = [
  "pizarron-verde",
  "pizarron-negro",
  "pizarra-blanca",
  "transparente",
];
const PIZARRAS: readonly Pizarra[] = ["lineas", "en-lugar"];
const ALINEACIONES: readonly Alinear[] = ["=", "\\approx", "<", ">", "\\le", "\\ge", "ninguna"];
const IDIOMAS: readonly Idioma[] = ["es", "en"];
const PAQUETES: readonly Paquete[] = ["physics"];
const CLAVES_SUPUESTOS = ["positivos", "reales", "no-nulos"] as const;
const CLAVES = new Set([
  "formato",
  "titulo",
  "curso",
  "etiquetas",
  "tema",
  "ritmo",
  "pizarra",
  "alinear",
  "idioma",
  "paquetes",
  "macros",
  "supuestos",
  "prueba",
]);

/** Paso mientras se lee, antes de compilarlo. */
interface PasoFuente {
  titulo: string;
  linea: number;
  /** Fórmula unida con espacios (sin recortar) y dónde empieza cada trozo en la fuente. */
  formula: { texto: string; trozos: { desde: number; linea: number; col: number }[] } | null;
  formulas: number;
  compases: { posicion: Posicion; linea: number; acciones: AccionFuente[] }[];
  narracion: string[];
}

class Diagnosticos {
  readonly lista: Diagnostico[] = [];
  agregar(codigo: Codigo, mensaje: string, linea: number, columna = 1): void {
    const nivel = codigo.startsWith("E") ? "error" : "advertencia";
    this.lista.push({ codigo, nivel, mensaje, linea, columna });
  }
}

/**
 * Analiza un guion `.tiza` y devuelve el encabezado normalizado, los pasos compilados y los
 * diagnósticos ordenados por línea y columna. Nunca lanza excepciones por el contenido.
 */
export function analizar(texto: string, opciones: OpcionesAnalisis = {}): ResultadoAnalisis {
  const diag = new Diagnosticos();
  const lineas = normalizar(texto).split("\n");

  const cierre =
    lineas[0]?.trim() === "---" ? lineas.findIndex((l, i) => i > 0 && l.trim() === "---") : -2;
  if (cierre === -2) {
    diag.agregar("E01", "Falta el encabezado YAML: el archivo debe empezar con una línea ---", 1);
    return resultado(null, [], diag, null);
  }
  if (cierre === -1) {
    diag.agregar("E01", "El encabezado YAML no se cierra con una línea ---", 1);
    return resultado(null, [], diag, null);
  }

  const { encabezado, prueba } = leerEncabezado(lineas.slice(1, cierre).join("\n"), diag);
  const fuentes = leerPasos(lineas, cierre + 1, diag);
  const pasos = compilarPasos(fuentes, encabezado, cierre + 1, diag, opciones);
  return resultado(encabezado, pasos, diag, prueba);
}

/**
 * Analiza y arma el `GuionCompilado` (contrato C2). Devuelve `guion: null` si hay errores.
 */
export function compilar(
  texto: string,
  opciones: OpcionesAnalisis = {},
): { guion: GuionCompilado | null; diagnosticos: Diagnostico[] } {
  const r = analizar(texto, opciones);
  const hayErrores = r.diagnosticos.some((d) => d.nivel === "error");
  return {
    guion: hayErrores || !r.encabezado ? null : { ...r.encabezado, pasos: r.pasos },
    diagnosticos: r.diagnosticos,
  };
}

function resultado(
  encabezado: Encabezado | null,
  pasos: PasoCompilado[],
  diag: Diagnosticos,
  prueba: Prueba | null,
): ResultadoAnalisis {
  const diagnosticos = [...diag.lista].sort((a, b) => a.linea - b.linea || a.columna - b.columna);
  return { encabezado, pasos, diagnosticos, prueba };
}

/** CRLF → LF, sin BOM, y comentarios HTML cambiados por espacios (conserva líneas y columnas). */
function normalizar(texto: string): string {
  return texto
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

/* ------------------------------------------------------------------ encabezado */

function leerEncabezado(
  yaml: string,
  diag: Diagnosticos,
): { encabezado: Encabezado | null; prueba: Prueba | null } {
  // El YAML empieza en la línea 2 del archivo.
  const contador = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter: contador, uniqueKeys: true });
  const lineaDe = (offset: number | undefined): { linea: number; col: number } => {
    const p = contador.linePos(offset ?? 0);
    // +1: la línea 1 del archivo es el --- de apertura
    return { linea: p.line + 1, col: p.col };
  };
  if (doc.errors.length > 0) {
    const e = doc.errors[0];
    const { linea, col } = lineaDe(e?.pos[0]);
    diag.agregar("E01", `YAML inválido en el encabezado: ${primeraLinea(e?.message)}`, linea, col);
    return { encabezado: null, prueba: null };
  }
  const raiz: unknown = doc.contents;
  if (raiz !== null && !isMap(raiz)) {
    diag.agregar("E01", "El encabezado debe ser un mapa de claves YAML", 2);
    return { encabezado: null, prueba: null };
  }
  const valores = (doc.toJS() ?? {}) as Record<string, unknown>;
  const pos = (clave: string): { linea: number; col: number } => posClave(doc, clave, lineaDe);

  for (const clave of Object.keys(valores)) {
    if (!CLAVES.has(clave)) {
      const p = pos(clave);
      diag.agregar("W01", `Clave de encabezado desconocida «${clave}»: se ignora`, p.linea, p.col);
    }
  }

  let valido = true;
  const formato = valores["formato"];
  if (formato === undefined || formato === null || formato === "") {
    diag.agregar("E01", "Falta la clave formato en el encabezado", 2);
    valido = false;
  } else if (!FORMATOS.includes(formato as Formato)) {
    const p = pos("formato");
    diag.agregar(
      "E02",
      `formato «${String(formato)}» no admitido: usa tiza/0.2 (o tiza/0.1)`,
      p.linea,
      p.col,
    );
    valido = false;
  }
  const titulo = valores["titulo"];
  if (typeof titulo !== "string" || !titulo.trim()) {
    const p = titulo === undefined ? { linea: 2, col: 1 } : pos("titulo");
    diag.agregar("E03", "Falta titulo (texto no vacío) en el encabezado", p.linea, p.col);
    valido = false;
  }

  /** Valor de una enumeración; si no calza, W01 y el valor por omisión. */
  const enumerado = <T extends string>(clave: string, admitidos: readonly T[], omision: T): T => {
    const v = valores[clave];
    if (v === undefined || v === null) return omision;
    if (admitidos.includes(v as T)) return v as T;
    const p = pos(clave);
    diag.agregar(
      "W01",
      `Valor «${String(v)}» no válido para ${clave} (${admitidos.join(", ")}): se usa «${omision}»`,
      p.linea,
      p.col,
    );
    return omision;
  };
  const listaTextos = (v: unknown, nombre: string, p: { linea: number; col: number }): string[] => {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number")) {
      return v.map(String);
    }
    diag.agregar("W01", `${nombre} debe ser una lista de textos: se ignora`, p.linea, p.col);
    return [];
  };

  const tema = enumerado("tema", TEMAS, "pizarron-verde");
  const pizarra = enumerado("pizarra", PIZARRAS, "lineas");
  const alinear = enumerado("alinear", ALINEACIONES, "=");
  const idioma = enumerado("idioma", IDIOMAS, "es");
  const etiquetas = listaTextos(valores["etiquetas"], "etiquetas", pos("etiquetas"));

  let ritmo = 1;
  const ritmoFuente = valores["ritmo"];
  if (ritmoFuente !== undefined && ritmoFuente !== null) {
    if (typeof ritmoFuente === "number" && ritmoFuente >= 0.25 && ritmoFuente <= 3)
      ritmo = ritmoFuente;
    else {
      const p = pos("ritmo");
      diag.agregar("W01", `ritmo debe ser un número entre 0.25 y 3: se usa 1.0`, p.linea, p.col);
    }
  }

  const paquetes: Paquete[] = [];
  const pPaquetes = pos("paquetes");
  const paquetesFuente = valores["paquetes"];
  const listaPaquetes =
    typeof paquetesFuente === "string"
      ? [paquetesFuente]
      : listaTextos(paquetesFuente, "paquetes", pPaquetes);
  for (const p of listaPaquetes) {
    if (PAQUETES.includes(p as Paquete)) {
      if (!paquetes.includes(p as Paquete)) paquetes.push(p as Paquete);
    } else {
      diag.agregar("W01", `Paquete desconocido «${p}»: se ignora`, pPaquetes.linea, pPaquetes.col);
    }
  }
  if (paquetes.includes("physics")) {
    diag.agregar(
      "W08",
      "Paquete physics activo: \\div, \\dd y otros comandos cambian de significado",
      pPaquetes.linea,
      pPaquetes.col,
    );
  }

  let macros = "";
  const macrosFuente = valores["macros"];
  if (typeof macrosFuente === "string") macros = macrosFuente;
  else if (macrosFuente !== undefined && macrosFuente !== null) {
    const p = pos("macros");
    diag.agregar("W01", "macros debe ser un bloque de texto: se ignora", p.linea, p.col);
  }

  const supuestos: Supuestos = { positivos: [], reales: [], "no-nulos": [] };
  const supFuente = valores["supuestos"];
  if (supFuente !== undefined && supFuente !== null) {
    const p = pos("supuestos");
    if (typeof supFuente !== "object" || Array.isArray(supFuente)) {
      diag.agregar(
        "W01",
        "supuestos debe ser un mapa (positivos, reales, no-nulos): se ignora",
        p.linea,
        p.col,
      );
    } else {
      for (const [k, v] of Object.entries(supFuente as Record<string, unknown>)) {
        if ((CLAVES_SUPUESTOS as readonly string[]).includes(k)) {
          supuestos[k as (typeof CLAVES_SUPUESTOS)[number]] = listaTextos(v, `supuestos.${k}`, p);
        } else {
          diag.agregar("W01", `Clave desconocida «${k}» en supuestos: se ignora`, p.linea, p.col);
        }
      }
    }
  }

  const curso = valores["curso"];
  const pruebaFuente = valores["prueba"];
  const prueba =
    pruebaFuente && typeof pruebaFuente === "object" && !Array.isArray(pruebaFuente)
      ? leerPrueba(pruebaFuente as Record<string, unknown>)
      : null;

  if (!valido) return { encabezado: null, prueba };
  const encabezado: Encabezado = {
    formato: formato as Formato,
    titulo: (titulo as string).trim(),
    ...(curso !== undefined && curso !== null ? { curso: String(curso) } : {}),
    etiquetas,
    tema,
    ritmo,
    pizarra,
    alinear,
    idioma,
    paquetes,
    macros,
    supuestos,
  };
  return { encabezado, prueba };
}

function leerPrueba(p: Record<string, unknown>): Prueba {
  const prueba: Prueba = {};
  if (typeof p["objetivo"] === "string") prueba.objetivo = p["objetivo"];
  if (Array.isArray(p["cubre"])) prueba.cubre = p["cubre"].map(String);
  if (typeof p["esperado"] === "string") prueba.esperado = p["esperado"];
  return prueba;
}

function posClave(
  doc: Document,
  clave: string,
  lineaDe: (offset: number | undefined) => { linea: number; col: number },
): { linea: number; col: number } {
  const raiz = doc.contents;
  if (isMap(raiz)) {
    for (const par of raiz.items) {
      if (isScalar(par.key) && par.key.value === clave) {
        return lineaDe(par.key.range?.[0]);
      }
    }
  }
  return { linea: 2, col: 1 };
}

function primeraLinea(s: string | undefined): string {
  return (s ?? "error de sintaxis").split("\n")[0] ?? "";
}

/* ------------------------------------------------------------------ cuerpo */

function leerPasos(lineas: string[], desde: number, diag: Diagnosticos): PasoFuente[] {
  const pasos: PasoFuente[] = [];
  let actual: PasoFuente | null = null;
  let abierta: {
    trozos: string[];
    inicios: { linea: number; col: number }[];
    linea: number;
  } | null = null;

  const cerrarFormula = (
    paso: PasoFuente,
    trozos: string[],
    inicios: { linea: number; col: number }[],
  ) => {
    paso.formulas++;
    if (paso.formulas > 1) return;
    let desdeTexto = 0;
    const marcas = inicios.map((ini, k) => {
      const m = { desde: desdeTexto, linea: ini.linea, col: ini.col };
      desdeTexto += (trozos[k] ?? "").length + 1;
      return m;
    });
    paso.formula = { texto: trozos.join(" "), trozos: marcas };
  };

  for (let i = desde; i < lineas.length; i++) {
    const cruda = lineas[i] ?? "";
    const ln = i + 1;
    if (abierta && actual) {
      const k = cruda.indexOf("$$");
      if (k >= 0) {
        abierta.trozos.push(cruda.slice(0, k));
        abierta.inicios.push({ linea: ln, col: 0 });
        cerrarFormula(actual, abierta.trozos, abierta.inicios);
        abierta = null;
        restoTrasFormula(cruda.slice(k + 2), ln, k + 2, diag);
      } else {
        abierta.trozos.push(cruda);
        abierta.inicios.push({ linea: ln, col: 0 });
      }
      continue;
    }
    const sangria = cruda.length - cruda.trimStart().length;
    const l = cruda.trim();
    if (!l) continue;
    if (/^##(\s|$)/.test(l)) {
      actual = {
        titulo: l.slice(2).trim(),
        linea: ln,
        formula: null,
        formulas: 0,
        compases: [],
        narracion: [],
      };
      pasos.push(actual);
      continue;
    }
    if (!actual) {
      diag.agregar(
        "W00",
        "Texto fuera de un paso (antes del primer ##): se ignora",
        ln,
        sangria + 1,
      );
      continue;
    }
    if (l.startsWith("::")) {
      const cuerpo = l.slice(2);
      const colCuerpo = sangria + 2;
      const acciones: AccionFuente[] = [];
      const trozos = partirCompas(cuerpo);
      if (trozos.length === 0) diag.agregar("E08", "Línea :: sin acción", ln, sangria + 1);
      for (const { trozo, col } of trozos) {
        const r = leerAccion(trozo, colCuerpo + col);
        if (r.problema) diag.agregar("E08", r.problema.mensaje, ln, r.problema.col + 1);
        else acciones.push(r.accion);
      }
      const posicion: Posicion = actual.formulas > 0 ? "posterior" : "previa";
      if (acciones.length > 0) actual.compases.push({ posicion, linea: ln, acciones });
      continue;
    }
    if (l.startsWith("$$")) {
      if (actual.formulas > 0)
        diag.agregar("E06", "Más de una fórmula en el paso", ln, sangria + 1);
      const cuerpo = l.slice(2);
      const k = cuerpo.indexOf("$$");
      const inicio = { linea: ln, col: sangria + 2 };
      if (k >= 0) {
        cerrarFormula(actual, [cuerpo.slice(0, k)], [inicio]);
        restoTrasFormula(cuerpo.slice(k + 2), ln, sangria + 4 + k, diag);
      } else {
        abierta = { trozos: [cuerpo], inicios: [inicio], linea: ln };
      }
      continue;
    }
    if (l.startsWith(">")) {
      actual.narracion.push(l.slice(1).trim());
      continue;
    }
    diag.agregar("W00", "Línea que no es ##, ::, $$ ni >: se ignora", ln, sangria + 1);
  }
  if (abierta && actual) {
    diag.agregar("E07", "Fórmula sin $$ de cierre", abierta.linea, 1);
    cerrarFormula(actual, abierta.trozos, abierta.inicios);
  }
  return pasos;
}

function restoTrasFormula(resto: string, ln: number, col: number, diag: Diagnosticos): void {
  if (resto.trim()) diag.agregar("W00", "Texto después del $$ de cierre: se ignora", ln, col + 1);
}

function compilarPasos(
  fuentes: PasoFuente[],
  encabezado: Encabezado | null,
  lineaCuerpo: number,
  diag: Diagnosticos,
  opciones: OpcionesAnalisis,
): PasoCompilado[] {
  const implementados = opciones.implementados ?? VERBOS_IMPLEMENTADOS;
  const maxGlifos = opciones.maxGlifos ?? 60;
  const maxPasos = opciones.maxPasos ?? 12;
  const pizarra = encabezado?.pizarra ?? "lineas";
  const physics = encabezado?.paquetes.includes("physics") ?? false;
  const sup = encabezado?.supuestos;
  const declarados = new Set(
    sup ? [...sup.positivos, ...sup.reales, ...sup["no-nulos"]].map(normalizarSimbolo) : [],
  );

  const primero = fuentes[0];
  if (!primero) {
    diag.agregar("E04", "El guion no tiene pasos (bloques ##)", lineaCuerpo + 1);
  } else if (!primero.formula || !primero.formula.texto.trim()) {
    diag.agregar("E04", "El primer paso debe tener fórmula", primero.linea);
  }
  if (fuentes.length > maxPasos) {
    const p = fuentes[maxPasos];
    diag.agregar(
      "W04",
      `${fuentes.length} pasos: más de ${maxPasos}, conviene dividir la derivación`,
      p?.linea ?? 1,
    );
  }

  return fuentes.map((f, n): PasoCompilado => {
    let modo: Modo = pizarra === "en-lugar" ? "en-lugar" : "nueva-linea";
    const compases: Compas[] = [];
    const sinFormula = !f.formula || !f.formula.texto.trim();

    for (const c of f.compases) {
      const acciones = [];
      for (const a of c.acciones) {
        const verbo = a.verbo as VerboFuente;
        const col = a.col + 1;
        if (!implementados.has(verbo)) {
          diag.agregar(
            "W02",
            `«${verbo}» aún no está en el motor: se usa la transición automática`,
            c.linea,
            col,
          );
        }
        if (n === 0 && c.posicion === "previa" && VERBOS_TRANSFORMACION.has(verbo)) {
          diag.agregar(
            "E12",
            `El primer paso no puede transformar: «${verbo}» antes de la fórmula`,
            c.linea,
            col,
          );
        } else if (sinFormula && !VERBOS_SIN_FORMULA.has(verbo)) {
          diag.agregar(
            "E08",
            `«${verbo}» no va en un paso sin fórmula, que solo agrega marcas`,
            c.linea,
            col,
          );
        } else if (!sinFormula && !posicionAdmitida(verbo, c.posicion)) {
          const donde = c.posicion === "previa" ? "después" : "antes";
          diag.agregar("E08", `«${verbo}» va ${donde} de la fórmula`, c.linea, col);
        }
        if (a.verbo === "en-lugar" || a.verbo === "nueva-linea") modo = a.verbo;
        else if ("accion" in a) acciones.push(a.accion);
      }
      if (acciones.length > 0) compases.push({ posicion: c.posicion, linea: c.linea, acciones });
    }
    if (n === 0) modo = "nueva-linea";

    const ids: string[] = [];
    let latex: string | null = null;
    if (f.formula && !sinFormula) {
      const { texto, trozos } = f.formula;
      latex = texto.trim();
      const donde = (pos: number): { linea: number; col: number } => {
        let t = trozos[0] ?? { desde: 0, linea: f.linea, col: 0 };
        for (const tr of trozos) if (tr.desde <= pos) t = tr;
        return { linea: t.linea, col: t.col + (pos - t.desde) + 1 };
      };
      for (const h of construccionesNoAdmitidas(texto)) {
        const p = donde(h.pos);
        diag.agregar("E07", h.mensaje, p.linea, p.col);
      }
      for (const h of delimitadoresSinPareja(texto)) {
        const p = donde(h.pos);
        diag.agregar("E13", h.mensaje, p.linea, p.col);
      }
      for (const id of extraerIds(texto)) {
        const p = donde(id.pos);
        if (id.sinExpresion) {
          diag.agregar(
            "E11",
            "\\id necesita dos argumentos: \\id{nombre}{expresión}",
            p.linea,
            p.col,
          );
        } else if (!PATRON_ID.test(id.nombre) || id.nombre.length > LARGO_MAXIMO_ID) {
          diag.agregar(
            "E11",
            `Nombre de \\id inválido «${id.nombre}»: [a-z][a-z0-9-]*, hasta ${LARGO_MAXIMO_ID} caracteres`,
            p.linea,
            p.col,
          );
        } else if (ids.includes(id.nombre)) {
          diag.agregar("E11", `\\id «${id.nombre}» repetido en el paso`, p.linea, p.col);
        } else {
          ids.push(id.nombre);
        }
      }
      const glifos = estimarGlifos(texto, { physics });
      if (glifos > maxGlifos) {
        diag.agregar(
          "W03",
          `Cerca de ${glifos} glifos (más de ${maxGlifos}): puede costar leerlo en proyección`,
          f.linea,
        );
      }
      if (declarados.size > 0) {
        const faltan: string[] = [];
        for (const s of extraerSimbolos(texto)) {
          const ok = declarados.has(normalizarSimbolo(s.simbolo)) || declarados.has(s.base);
          if (!ok && !faltan.includes(s.simbolo)) faltan.push(s.simbolo);
        }
        if (faltan.length > 0) {
          diag.agregar("W05", `Símbolos que no están en supuestos: ${faltan.join(", ")}`, f.linea);
        }
      }
    }

    return {
      id: `p${n + 1}`,
      titulo: f.titulo,
      latex,
      modo,
      ids,
      compases,
      narracion: f.narracion.filter(Boolean).join(" "),
      linea: f.linea,
    };
  });
}
