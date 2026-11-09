/**
 * Utilidades sobre el LaTeX de una fórmula que no necesitan componerla:
 * fichas, macros de Tiza (ADR 0002), `\id`, construcciones no admitidas (E07),
 * pares `\left`/`\right` (E13), estimación de glifos (W03) y símbolos (W05).
 *
 * Las posiciones son índices en el texto recibido, desde 0.
 */

export type TipoFicha = "comando" | "caracter" | "abre" | "cierra" | "sup" | "sub" | "espacio";

export interface Ficha {
  tipo: TipoFicha;
  /** Texto de la ficha: `\frac`, `x`, `{`, `^`… */
  valor: string;
  pos: number;
}

/** Divide `tex` en fichas. Un comando es `\` + letras o `\` + un carácter (`\\`, `\,`, `\{`). */
export function tokenizar(tex: string): Ficha[] {
  const fichas: Ficha[] = [];
  let i = 0;
  while (i < tex.length) {
    const c = tex.charAt(i);
    if (c === "\\") {
      let j = i + 1;
      while (j < tex.length && esLetra(tex.charAt(j))) j++;
      if (j === i + 1) j = Math.min(i + 2, tex.length);
      fichas.push({ tipo: "comando", valor: tex.slice(i, j), pos: i });
      i = j;
    } else if (c === "{") {
      fichas.push({ tipo: "abre", valor: c, pos: i++ });
    } else if (c === "}") {
      fichas.push({ tipo: "cierra", valor: c, pos: i++ });
    } else if (c === "^") {
      fichas.push({ tipo: "sup", valor: c, pos: i++ });
    } else if (c === "_") {
      fichas.push({ tipo: "sub", valor: c, pos: i++ });
    } else if (/\s/.test(c)) {
      let j = i + 1;
      while (j < tex.length && /\s/.test(tex.charAt(j))) j++;
      fichas.push({ tipo: "espacio", valor: tex.slice(i, j), pos: i });
      i = j;
    } else {
      // un punto de código completo (no partir pares sustitutos)
      const cp = tex.codePointAt(i) ?? 0;
      const largo = cp > 0xffff ? 2 : 1;
      fichas.push({ tipo: "caracter", valor: tex.slice(i, i + largo), pos: i });
      i += largo;
    }
  }
  return fichas;
}

function esLetra(c: string): boolean {
  return /^[A-Za-z]$/.test(c);
}

/**
 * Lee un grupo `{…}` balanceado que empieza en `i` (debe apuntar a `{`).
 * Devuelve el contenido sin las llaves y la posición siguiente al `}`.
 * Si el grupo no se cierra, devuelve hasta el final del texto.
 */
export function leerGrupo(tex: string, i: number): [contenido: string, fin: number] {
  let profundidad = 0;
  for (let j = i; j < tex.length; j++) {
    const c = tex.charAt(j);
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "{") profundidad++;
    else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return [tex.slice(i + 1, j), j + 1];
    }
  }
  return [tex.slice(i + 1), tex.length];
}

/** Salta espacios desde `i`. */
function saltarEspacios(tex: string, i: number): number {
  while (i < tex.length && /\s/.test(tex.charAt(i))) i++;
  return i;
}

/**
 * Lee un argumento de macro desde `i` (salta espacios antes): un grupo `{…}`, un comando
 * o un carácter. Devuelve el argumento (sin llaves si era grupo) y la posición siguiente.
 */
export function leerArgumento(tex: string, i: number): [arg: string, fin: number] | null {
  const j = saltarEspacios(tex, i);
  if (j >= tex.length) return null;
  const c = tex.charAt(j);
  if (c === "{") return leerGrupo(tex, j);
  if (c === "}") return null;
  if (c === "\\") {
    let k = j + 1;
    while (k < tex.length && esLetra(tex.charAt(k))) k++;
    if (k === j + 1) k = Math.min(j + 2, tex.length);
    return [tex.slice(j, k), k];
  }
  const cp = tex.codePointAt(j) ?? 0;
  const largo = cp > 0xffff ? 2 : 1;
  return [tex.slice(j, j + largo), j + largo];
}

/** ¿Hay un comando `nombre` (sin `\`) en `i`, no seguido de otra letra? */
function hayComando(tex: string, i: number, nombre: string): boolean {
  return tex.startsWith("\\" + nombre, i) && !esLetra(tex.charAt(i + nombre.length + 1));
}

/**
 * Expande `\tensor{T}{^\mu_\nu}` a `{T}^{\mu}{}_{\nu}`, como el paquete `tensor` de LaTeX
 * (especificación 5.3). Los índices seguidos en la misma posición se agrupan:
 * `{^\rho_\sigma_\mu_\nu}` → `^{\rho}{}_{\sigma \mu \nu}`.
 */
export function expandirTensor(tex: string): string {
  let salida = "";
  let i = 0;
  while (i < tex.length) {
    if (hayComando(tex, i, "tensor")) {
      const base = leerArgumento(tex, i + "\\tensor".length);
      if (!base) {
        salida += tex.slice(i);
        break;
      }
      let j = saltarEspacios(tex, base[1]);
      let indices = "";
      if (tex.charAt(j) === "{") {
        [indices, j] = leerGrupo(tex, j);
      }
      const grupos: { pos: string; items: string[] }[] = [];
      let k = 0;
      while (k < indices.length) {
        const c = indices.charAt(k);
        if (c !== "^" && c !== "_") {
          k++;
          continue;
        }
        const arg = leerArgumento(indices, k + 1);
        if (!arg) break;
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.pos === c) ultimo.items.push(arg[0]);
        else grupos.push({ pos: c, items: [arg[0]] });
        k = arg[1];
      }
      salida +=
        "{" +
        expandirTensor(base[0]) +
        "}" +
        grupos
          .map(
            (g, n) => (n ? "{}" : "") + g.pos + "{" + g.items.map(expandirTensor).join(" ") + "}",
          )
          .join("");
      i = j;
      continue;
    }
    salida += tex.charAt(i++);
  }
  return salida;
}

/**
 * Macros de delimitadores de Tiza (especificación 5.2, ADR 0002): nombre → [plantilla, número de
 * argumentos]. Coinciden en nombre y significado con las del paquete `physics`.
 */
export const MACROS_TIZA: Readonly<
  Record<string, readonly [plantilla: string, argumentos: number]>
> = {
  comm: ["\\left[ #1, #2 \\right]", 2],
  acomm: ["\\left\\{ #1, #2 \\right\\}", 2],
  expval: ["\\left\\langle #1 \\right\\rangle", 1],
  abs: ["\\left\\lvert #1 \\right\\rvert", 1],
  norm: ["\\left\\lVert #1 \\right\\rVert", 1],
};

/** Expande `\comm`, `\acomm`, `\expval`, `\abs` y `\norm` a `\left … \right`, también anidadas. */
export function expandirMacrosTiza(tex: string): string {
  let salida = "";
  let i = 0;
  while (i < tex.length) {
    if (tex.charAt(i) === "\\") {
      let j = i + 1;
      while (j < tex.length && esLetra(tex.charAt(j))) j++;
      const nombre = tex.slice(i + 1, j);
      const macro = MACROS_TIZA[nombre];
      if (macro && j > i + 1) {
        const [plantilla, n] = macro;
        const args: string[] = [];
        let k = j;
        for (let a = 0; a < n; a++) {
          const arg = leerArgumento(tex, k);
          if (!arg) break;
          args.push(arg[0]);
          k = arg[1];
        }
        if (args.length === n) {
          salida += plantilla.replace(/#([12])/g, (_, d: string) =>
            expandirMacrosTiza(args[Number(d) - 1] ?? ""),
          );
          i = k;
          continue;
        }
      }
      // comando común (o macro con argumentos incompletos): se copia tal cual
      const fin = j === i + 1 ? Math.min(i + 2, tex.length) : j;
      salida += tex.slice(i, fin);
      i = fin;
      continue;
    }
    salida += tex.charAt(i++);
  }
  return salida;
}

/** Cambia `\id{nombre}{expr}` por `{expr}` (la definición de `\id` fuera de Tiza, 5.1). */
export function quitarIds(tex: string): string {
  let salida = "";
  let i = 0;
  while (i < tex.length) {
    if (hayComando(tex, i, "id")) {
      const nombre = leerArgumento(tex, i + 3);
      const expr = nombre ? leerArgumento(tex, nombre[1]) : null;
      if (nombre && expr) {
        salida += "{" + quitarIds(expr[0]) + "}";
        i = expr[1];
        continue;
      }
    }
    if (tex.charAt(i) === "\\") {
      salida += tex.slice(i, i + 2);
      i += 2;
      continue;
    }
    salida += tex.charAt(i++);
  }
  return salida;
}

export interface OpcionesPreproceso {
  /** Con `paquetes: [physics]`, las macros de delimitadores las define `physics` y no se expanden. */
  physics?: boolean;
  /** Quitar `\id` (por omisión no: tipografía los necesita para marcar glifos). */
  quitarIds?: boolean;
}

/** Preprocesamiento de Tiza antes de componer: `\tensor` y macros de delimitadores. */
export function preprocesar(tex: string, opciones: OpcionesPreproceso = {}): string {
  let salida = expandirTensor(tex);
  if (!opciones.physics) salida = expandirMacrosTiza(salida);
  if (opciones.quitarIds) salida = quitarIds(salida);
  return salida;
}

/** Nombre válido de `\id` (especificación 5.1). */
export const PATRON_ID = /^[a-z][a-z0-9-]*$/;
export const LARGO_MAXIMO_ID = 24;

export interface IdEncontrado {
  nombre: string;
  /** Posición de `\id` en el texto. */
  pos: number;
  /** Falta el segundo argumento `{expresión}`. */
  sinExpresion: boolean;
}

/** Busca los `\id{nombre}{…}` en orden de lectura (también anidados). */
export function extraerIds(tex: string): IdEncontrado[] {
  const encontrados: IdEncontrado[] = [];
  for (let i = 0; i < tex.length; i++) {
    if (tex.charAt(i) === "\\" && !hayComando(tex, i, "id")) {
      i++;
      continue;
    }
    if (!hayComando(tex, i, "id")) continue;
    const j = saltarEspacios(tex, i + 3);
    if (tex.charAt(j) !== "{") {
      encontrados.push({ nombre: "", pos: i, sinExpresion: true });
      continue;
    }
    const [nombre, fin] = leerGrupo(tex, j);
    const k = saltarEspacios(tex, fin);
    encontrados.push({ nombre: nombre.trim(), pos: i, sinExpresion: tex.charAt(k) !== "{" });
    i = fin - 1;
  }
  return encontrados;
}

export interface Hallazgo {
  pos: number;
  mensaje: string;
}

const COMANDOS_NO_ADMITIDOS: Readonly<Record<string, string>> = {
  "\\begin": "entornos (\\begin{…})",
  "\\end": "entornos (\\end{…})",
  "\\\\": "salto de línea \\\\",
  "\\color": "\\color (los colores los decide el motor)",
  "\\textcolor": "\\textcolor (los colores los decide el motor)",
  "\\label": "\\label",
  "\\tag": "\\tag",
};

const COMANDOS_TEXTO = new Set(["\\text", "\\textrm", "\\textit", "\\textbf", "\\mbox"]);

/** Construcciones no admitidas en `tiza/0.2` (sección 5): E07. */
export function construccionesNoAdmitidas(tex: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const fichas = tokenizar(tex);
  for (const [n, f] of fichas.entries()) {
    if (f.tipo === "comando") {
      const motivo = COMANDOS_NO_ADMITIDOS[f.valor];
      if (motivo) hallazgos.push({ pos: f.pos, mensaje: `Construcción no admitida: ${motivo}` });
      if (COMANDOS_TEXTO.has(f.valor)) {
        const sig = fichas.slice(n + 1).find((x) => x.tipo !== "espacio");
        if (sig?.tipo === "abre") {
          const [contenido] = leerGrupo(tex, sig.pos);
          if (/[\\$]/.test(contenido)) {
            hallazgos.push({
              pos: f.pos,
              mensaje: `Construcción no admitida: ${f.valor}{} con LaTeX anidado`,
            });
          }
        }
      }
    } else if (f.tipo === "caracter" && f.valor === "&") {
      hallazgos.push({ pos: f.pos, mensaje: "Construcción no admitida: & (alineación)" });
    }
  }
  return hallazgos;
}

/** Pares `\left` / `\right` y `\middle` dentro de un par (E13). */
export function delimitadoresSinPareja(tex: string): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const abiertos: number[] = [];
  for (const f of tokenizar(tex)) {
    if (f.tipo !== "comando") continue;
    if (f.valor === "\\left") abiertos.push(f.pos);
    else if (f.valor === "\\right") {
      if (abiertos.pop() === undefined)
        hallazgos.push({ pos: f.pos, mensaje: "\\right sin su \\left" });
    } else if (f.valor === "\\middle" && abiertos.length === 0) {
      hallazgos.push({ pos: f.pos, mensaje: "\\middle fuera de un par \\left … \\right" });
    }
  }
  for (const pos of abiertos) hallazgos.push({ pos, mensaje: "\\left sin su \\right" });
  return hallazgos.sort((a, b) => a.pos - b.pos);
}

/** Comandos que no dibujan nada por sí mismos. */
const SIN_GLIFO = new Set([
  "\\left",
  "\\right",
  "\\middle",
  "\\big",
  "\\Big",
  "\\bigg",
  "\\Bigg",
  "\\bigl",
  "\\bigr",
  "\\Bigl",
  "\\Bigr",
  "\\biggl",
  "\\biggr",
  "\\Biggl",
  "\\Biggr",
  "\\,",
  "\\;",
  "\\:",
  "\\!",
  "\\ ",
  "\\quad",
  "\\qquad",
  "\\mathrm",
  "\\mathbf",
  "\\mathit",
  "\\mathcal",
  "\\mathbb",
  "\\boldsymbol",
  "\\displaystyle",
  "\\textstyle",
  "\\text",
  "\\textrm",
  "\\mbox",
  "\\limits",
  "\\nolimits",
  "\\tensor",
  "\\id",
]);

/** Comandos que dibujan una raya o un signo propio además de su contenido. */
const CON_UN_GLIFO = new Set(["\\frac", "\\dfrac", "\\tfrac", "\\sqrt"]);

/** Nombres de función: se dibujan con varias letras rectas. */
const FUNCIONES = /^\\(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|ln|log|exp|lim|max|min|det|arg)$/;

/**
 * Estimación del número de glifos de una fórmula, sin componerla (W03). Cuenta letras, cifras,
 * signos y símbolos; las rayas de fracción y los signos de raíz cuentan uno; espaciado, llaves y
 * `\left`/`\right` no cuentan (sí el delimitador que los sigue). La cuenta exacta la hará
 * `tipografia` (W3) con los glifos compuestos.
 */
export function estimarGlifos(tex: string, opciones: OpcionesPreproceso = {}): number {
  const prep = preprocesar(tex, { ...opciones, quitarIds: true });
  let n = 0;
  for (const f of tokenizar(prep)) {
    if (f.tipo === "caracter") {
      if (f.valor !== "." || !esDelimitadorVacio(prep, f.pos)) n++;
    } else if (f.tipo === "comando") {
      if (CON_UN_GLIFO.has(f.valor)) n++;
      else if (FUNCIONES.test(f.valor)) n += f.valor.length - 1;
      else if (!SIN_GLIFO.has(f.valor)) n++;
    }
  }
  return n;
}

/** ¿El `.` en `pos` es un delimitador vacío (`\left.` o `\right.`)? */
function esDelimitadorVacio(tex: string, pos: number): boolean {
  const antes = tex.slice(0, pos).trimEnd();
  return /\\(left|right|middle)$/.test(antes);
}

const GRIEGAS = new Set(
  (
    "alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi " +
    "omicron rho varrho sigma varsigma tau upsilon phi varphi chi psi omega " +
    "Gamma Delta Theta Lambda Xi Sigma Upsilon Phi Psi Omega"
  )
    .split(" ")
    .map((g) => "\\" + g),
);

/** Comandos cuyo argumento es texto recto (unidades, operadores): sus letras no son símbolos. */
const ARGUMENTO_RECTO = new Set([
  "\\mathrm",
  "\\text",
  "\\textrm",
  "\\textit",
  "\\textbf",
  "\\mbox",
  "\\operatorname",
]);

export interface Simbolo {
  /** Símbolo con su subíndice simple, si tiene: `v_0`, `\theta`, `x`. */
  simbolo: string;
  /** Solo la base: `v`, `\theta`, `x`. */
  base: string;
  pos: number;
}

/**
 * Símbolos (variables) de una fórmula para W05, sin componerla. Heurística:
 * - letras latinas y griegas fuera de sub y superíndices (los índices tensoriales y los
 *   exponentes no son símbolos nuevos), con su subíndice simple (`v_0`, `x_{1}`);
 * - fuera de `\mathrm{}`, `\text{}` y `\operatorname{}`;
 * - sin `\pi` ni la `d` de un diferencial (`dx`, `d^2\psi`, `\frac{d}{dx}`).
 */
export function extraerSimbolos(tex: string): Simbolo[] {
  const prep = expandirMacrosTiza(expandirTensor(quitarIds(tex)));
  const fichas = tokenizar(prep);
  const simbolos: Simbolo[] = [];
  // Pila de grupos: cada uno sabe si es de script (sub/sup) o de texto recto.
  const pila: { script: boolean; recto: boolean }[] = [];
  let pendiente: "script" | "recto" | null = null;
  const dentro = (clave: "script" | "recto"): boolean =>
    pila.some((g) => (clave === "script" ? g.script : g.recto));

  for (let n = 0; n < fichas.length; n++) {
    const f = fichas[n];
    if (!f) continue;
    if (f.tipo === "espacio") continue;
    if (f.tipo === "abre") {
      pila.push({ script: pendiente === "script", recto: pendiente === "recto" });
      pendiente = null;
      continue;
    }
    if (f.tipo === "cierra") {
      pila.pop();
      continue;
    }
    if (f.tipo === "sup" || f.tipo === "sub") {
      // un script de una sola ficha se salta aquí; uno con grupo, al abrirlo
      const sig = siguienteNoEspacio(fichas, n + 1);
      if (sig !== null && fichas[sig]?.tipo !== "abre") n = sig;
      else pendiente = "script";
      continue;
    }
    // argumento de una sola ficha de \mathrm (como \mathrm d): no es símbolo
    const previo = pendiente;
    pendiente = null;
    if (previo !== null) continue;
    if (f.tipo === "comando" && ARGUMENTO_RECTO.has(f.valor)) {
      pendiente = "recto";
      continue;
    }
    if (dentro("script") || dentro("recto")) continue;

    let base: string | null = null;
    if (f.tipo === "caracter" && esLetra(f.valor)) base = f.valor;
    else if (f.tipo === "comando" && GRIEGAS.has(f.valor)) base = f.valor;
    if (base === null) continue;
    if (base === "d" && esDiferencial(fichas, n)) continue;

    simbolos.push({ simbolo: base + subindiceSimple(prep, fichas, n), base, pos: f.pos });
  }
  return simbolos;
}

function siguienteNoEspacio(fichas: Ficha[], desde: number): number | null {
  for (let k = desde; k < fichas.length; k++) if (fichas[k]?.tipo !== "espacio") return k;
  return null;
}

/** `d` seguida de una letra, una griega o `^` (como en `d^2\psi`), o sola en un numerador `{d}`. */
function esDiferencial(fichas: Ficha[], n: number): boolean {
  const k = siguienteNoEspacio(fichas, n + 1);
  const sig = k === null ? undefined : fichas[k];
  if (!sig) return false;
  if (sig.tipo === "sup") return true;
  if (sig.tipo === "caracter" && esLetra(sig.valor)) return true;
  if (sig.tipo === "comando" && GRIEGAS.has(sig.valor)) return true;
  const ant = fichas[n - 1];
  return ant?.tipo === "abre" && sig.tipo === "cierra";
}

/** Subíndice simple tras la ficha `n`: `_0`, `_{12}`, `_x`, `_\mu` → `_0`, `_12`… o "". */
function subindiceSimple(tex: string, fichas: Ficha[], n: number): string {
  const k = siguienteNoEspacio(fichas, n + 1);
  if (k === null || fichas[k]?.tipo !== "sub") return "";
  const arg = leerArgumento(tex, (fichas[k]?.pos ?? 0) + 1);
  if (!arg) return "";
  const contenido = arg[0].replace(/\s+/g, "");
  return /^([A-Za-z0-9]+|\\[A-Za-z]+)$/.test(contenido) ? "_" + contenido : "";
}

/** Normaliza un símbolo de `supuestos`: sin espacios y sin llaves en un subíndice simple. */
export function normalizarSimbolo(s: string): string {
  return s.replace(/\s+/g, "").replace(/_\{([^{}]+)\}$/, "_$1");
}
