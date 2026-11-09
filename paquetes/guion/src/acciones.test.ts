import { describe, expect, it } from "vitest";
import { dividirArgumentos, leerAccion, partirCompas, referenciaValida } from "./acciones.ts";

const accion = (t: string) => {
  const r = leerAccion(t, 0);
  return r.accion && "accion" in r.accion ? r.accion.accion : (r.accion ?? r.problema);
};
const problema = (t: string) => leerAccion(t, 0).problema;

describe("leerAccion: firmas de la sección 7", () => {
  it.each([
    ["pasar T^2 izq", { verbo: "pasar", objetivos: ["T^2"], lado: "izq" }],
    [
      "pasar {\\sqrt{1-\\frac{v^2}{c^2}}} izq",
      { verbo: "pasar", objetivos: ["\\sqrt{1-\\frac{v^2}{c^2}}"], lado: "izq" },
    ],
    ["pasar \\frac{G M}{r} der", { verbo: "pasar", objetivos: ["\\frac{G M}{r}"], lado: "der" }],
    ["cancelar ms mc", { verbo: "cancelar", objetivos: ["ms", "mc"] }],
    ["resaltar _\\nu#2", { verbo: "resaltar", objetivos: ["_\\nu#2"] }],
    ["borrar", { verbo: "borrar", objetivos: [] }],
    ["borrar {B\\cos(kx)}", { verbo: "borrar", objetivos: ["B\\cos(kx)"] }],
    ["expandir", { verbo: "expandir", objetivos: [] }],
    ["simplificar r", { verbo: "simplificar", objetivos: ["r"] }],
    ["recuadro", { verbo: "recuadro", objetivos: [] }],
    ["bajar _\\mu", { verbo: "bajar", objetivos: ["_\\mu"] }],
    ["subir ^\\mu", { verbo: "subir", objetivos: ["^\\mu"] }],
    ["factorizar \\mathrm{d}t^2", { verbo: "factorizar", objetivos: ["\\mathrm{d}t^2"] }],
    ["contraer _\\nu ^\\nu", { verbo: "contraer", objetivos: ["_\\nu", "^\\nu"] }],
    [
      "intercambiar \\hat{x} \\hat{p}",
      { verbo: "intercambiar", objetivos: ["\\hat{x}", "\\hat{p}"] },
    ],
    ["flecha a b", { verbo: "flecha", objetivos: ["a", "b"] }],
    ["pausa 1.5", { verbo: "pausa", segundos: 1.5 }],
    [
      "renombrar \\lambda \\sigma",
      { verbo: "renombrar", de: "\\lambda", a: "\\sigma", objetivos: [] },
    ],
    ["renombrar \\mu \\rho t3", { verbo: "renombrar", de: "\\mu", a: "\\rho", objetivos: ["t3"] }],
    ["sustituir v = \\frac{2\\pi r}{T}", { verbo: "sustituir", de: "v", a: "\\frac{2\\pi r}{T}" }],
    ["sustituir {a=b} = c", { verbo: "sustituir", de: "{a=b}", a: "c" }],
    ["ambos-lados \\cdot r", { verbo: "ambos-lados", tex: "\\cdot r" }],
    ["derivar t", { verbo: "derivar", variable: "t" }],
    ["integrar x", { verbo: "integrar", variable: "x" }],
    ["integrar x 0 {\\infty}", { verbo: "integrar", variable: "x", desde: "0", hasta: "\\infty" }],
    ['aproximar "x pequeño"', { verbo: "aproximar", texto: "x pequeño" }],
    ['nota "por simetría"', { verbo: "nota", texto: "por simetría", lado: "der" }],
    ['nota "$x$" izq', { verbo: "nota", texto: "$x$", lado: "izq" }],
    ['llave T^2 "período"', { verbo: "llave", objetivos: ["T^2"], texto: "período" }],
    ["columna", { verbo: "columna" }],
  ])("%s", (texto, esperado) => {
    expect(accion(texto)).toEqual(esperado);
  });

  it("en-lugar y nueva-linea quedan como acciones de modo", () => {
    expect(leerAccion("en-lugar", 3).accion).toEqual({ verbo: "en-lugar", col: 3 });
    expect(leerAccion("nueva-linea", 0).accion).toEqual({ verbo: "nueva-linea", col: 0 });
  });

  it.each([
    "mover x",
    "Pasar x der",
    "pasar x",
    "pasar x arriba",
    "pasar x der izq",
    'pasar "x" der',
    "cancelar",
    "expandir a b",
    "bajar",
    "contraer a",
    "intercambiar a b c",
    "pausa",
    "pausa -1",
    "pausa 0",
    "pausa 1,5",
    "renombrar \\mu",
    'renombrar "a" b',
    "renombrar a b c d",
    "sustituir v",
    "sustituir = v",
    "sustituir v =",
    "ambos-lados",
    "derivar",
    'derivar "t"',
    "integrar x 0",
    "aproximar x",
    'nota "a" arriba',
    'nota "a" "b"',
    "nota der",
    "llave T^2",
    'llave "a" "b"',
    "columna 2",
    "en-lugar ya",
    'nota "sin cerrar',
    "resaltar {a b",
    "resaltar r#0",
    "resaltar r#x",
    "resaltar ^",
    "resaltar #2",
  ])("E08: %s", (texto) => {
    expect(problema(texto)?.codigo).toBe("E08");
  });

  it("indica la columna del argumento que falla", () => {
    expect(leerAccion("pasar x arriba", 3).problema?.col).toBe(11);
  });
});

describe("partirCompas", () => {
  it("parte en ' + ' fuera de llaves", () => {
    expect(partirCompas(" resaltar a + pausa 1 + cancelar {a + b}")).toEqual([
      { trozo: "resaltar a", col: 1 },
      { trozo: "pausa 1", col: 14 },
      { trozo: "cancelar {a + b}", col: 24 },
    ]);
  });

  it("sustituir y ambos-lados se quedan con el resto de la línea", () => {
    expect(partirCompas(" sustituir v = a + b").map((t) => t.trozo)).toEqual([
      "sustituir v = a + b",
    ]);
    expect(partirCompas(" pausa 1 + ambos-lados + 5 + x").map((t) => t.trozo)).toEqual([
      "pausa 1",
      "ambos-lados + 5 + x",
    ]);
  });

  it("descarta trozos vacíos", () => {
    expect(partirCompas("   ")).toEqual([]);
  });
});

describe("dividirArgumentos", () => {
  it("separa fichas, grupos y cadenas", () => {
    const { args } = dividirArgumentos('a {b c} "d e" \\frac{x y}{z} {a b}#2', 0);
    expect(args.map((a) => [a.tipo, a.valor])).toEqual([
      ["ficha", "a"],
      ["tex", "b c"],
      ["cadena", "d e"],
      ["ficha", "\\frac{x y}{z}"],
      ["ficha", "{a b}#2"],
    ]);
  });

  it("\\{ no abre grupo", () => {
    const { args } = dividirArgumentos("\\{a\\} b", 0);
    expect(args.map((a) => a.valor)).toEqual(["\\{a\\}", "b"]);
  });
});

describe("referenciaValida", () => {
  it.each(["ms", "T^2", "r#2", "^\\mu", "_\\nu#2", "{a b}#2", "\\frac{GM}{r}"])(
    "válida: %s",
    (r) => {
      expect(referenciaValida(r)).toBe(true);
    },
  );
  it.each(["", " ", "^", "_", "r#", "r#0", "#1", "^#1"])("inválida: «%s»", (r) => {
    expect(referenciaValida(r)).toBe(false);
  });
});
