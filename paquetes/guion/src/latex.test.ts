import { describe, expect, it } from "vitest";
import {
  construccionesNoAdmitidas,
  delimitadoresSinPareja,
  estimarGlifos,
  expandirMacrosTiza,
  expandirTensor,
  extraerIds,
  extraerSimbolos,
  leerArgumento,
  leerGrupo,
  normalizarSimbolo,
  preprocesar,
  quitarIds,
  tokenizar,
} from "./latex.ts";

describe("tokenizar", () => {
  it("separa comandos, llaves, scripts, espacios y caracteres", () => {
    expect(tokenizar("\\frac{a}^\\\\ _x\\,").map((f) => `${f.tipo}:${f.valor}`)).toEqual([
      "comando:\\frac",
      "abre:{",
      "caracter:a",
      "cierra:}",
      "sup:^",
      "comando:\\\\",
      "espacio: ",
      "sub:_",
      "caracter:x",
      "comando:\\,",
    ]);
  });

  it("no parte caracteres fuera del plano básico", () => {
    expect(tokenizar("𝑥")).toHaveLength(1);
  });

  it("una barra al final queda como comando", () => {
    expect(tokenizar("a\\").at(-1)).toMatchObject({ tipo: "comando", valor: "\\" });
  });
});

describe("leerGrupo y leerArgumento", () => {
  it("lee grupos anidados y respeta \\{ \\}", () => {
    expect(leerGrupo("{a{b}\\}c}d", 0)).toEqual(["a{b}\\}c", 9]);
    expect(leerGrupo("{abierto", 0)).toEqual(["abierto", 8]);
  });

  it("lee grupo, comando o carácter", () => {
    expect(leerArgumento("  {x}", 0)).toEqual(["x", 5]);
    expect(leerArgumento(" \\mu_", 0)).toEqual(["\\mu", 4]);
    expect(leerArgumento("\\,", 0)).toEqual(["\\,", 2]);
    expect(leerArgumento("ab", 0)).toEqual(["a", 1]);
    expect(leerArgumento("   ", 0)).toBeNull();
    expect(leerArgumento("}", 0)).toBeNull();
  });
});

describe("expandirTensor (5.3)", () => {
  it.each([
    ["\\tensor{T}{^\\mu_\\nu}", "{T}^{\\mu}{}_{\\nu}"],
    ["\\tensor{R}{^\\rho_{\\sigma\\mu\\nu}}", "{R}^{\\rho}{}_{\\sigma\\mu\\nu}"],
    ["\\tensor{R}{^\\rho_\\sigma_\\mu_\\nu}", "{R}^{\\rho}{}_{\\sigma \\mu \\nu}"],
    ["\\tensor{\\Gamma}{^\\lambda_{\\mu\\nu}}", "{\\Gamma}^{\\lambda}{}_{\\mu\\nu}"],
    ["\\tensor{T}{^\\mu_{\\nu;\\mu}}", "{T}^{\\mu}{}_{\\nu;\\mu}"],
    ["\\tensor T {_a ^b}", "{T}_{a}{}^{b}"],
    ["a + \\tensor{T}{^\\mu} = b", "a + {T}^{\\mu} = b"],
    ["\\tensorial", "\\tensorial"],
  ])("%s → %s", (de, a) => {
    expect(expandirTensor(de)).toBe(a);
  });

  it("tolera \\tensor incompleto", () => {
    expect(expandirTensor("x \\tensor")).toBe("x \\tensor");
    expect(expandirTensor("\\tensor{T}")).toBe("{T}");
  });
});

describe("expandirMacrosTiza (5.2)", () => {
  it.each([
    ["\\comm{\\hat{x}}{\\hat{p}}", "\\left[ \\hat{x}, \\hat{p} \\right]"],
    ["\\acomm{\\sigma_i}{\\sigma_j}", "\\left\\{ \\sigma_i, \\sigma_j \\right\\}"],
    ["\\expval{\\hat{H}}", "\\left\\langle \\hat{H} \\right\\rangle"],
    ["\\abs{\\psi}^2", "\\left\\lvert \\psi \\right\\rvert^2"],
    ["\\norm{\\vec{v}}", "\\left\\lVert \\vec{v} \\right\\rVert"],
    ["\\abs{\\comm{A}{B}}", "\\left\\lvert \\left[ A, B \\right] \\right\\rvert"],
    ["\\comm A B", "\\left[ A, B \\right]"],
    ["\\absolute + \\comm{A}", "\\absolute + \\comm{A}"],
  ])("%s", (de, a) => {
    expect(expandirMacrosTiza(de)).toBe(a);
  });

  it("preprocesar expande tensor y macros, salvo macros con physics", () => {
    expect(preprocesar("\\abs{\\tensor{T}{^a}}")).toBe("\\left\\lvert {T}^{a} \\right\\rvert");
    expect(preprocesar("\\abs{\\tensor{T}{^a}}", { physics: true })).toBe("\\abs{{T}^{a}}");
    expect(preprocesar("\\id{a}{x}", { quitarIds: true })).toBe("{x}");
  });
});

describe("\\id", () => {
  it("quitarIds deja la expresión, también anidada", () => {
    expect(quitarIds("\\id{a}{x + \\id{b}{y}} = \\idx")).toBe("{x + {y}} = \\idx");
  });

  it("extraerIds encuentra nombres, posiciones y faltas", () => {
    expect(extraerIds("\\id{a}{x} + \\id{b} + \\id c + \\\\id{z}{w}")).toEqual([
      { nombre: "a", pos: 0, sinExpresion: false },
      { nombre: "b", pos: 12, sinExpresion: true },
      { nombre: "", pos: 21, sinExpresion: true },
    ]);
  });
});

describe("construccionesNoAdmitidas (E07)", () => {
  it.each([
    "\\begin{pmatrix}",
    "a \\\\ b",
    "a & b",
    "\\color{red} x",
    "\\textcolor{red}{x}",
    "\\label{e}",
    "\\tag{1}",
    "\\text{si $x$}",
    "\\text{con \\alpha}",
  ])("rechaza %s", (tex) => {
    expect(construccionesNoAdmitidas(tex)).toHaveLength(1);
  });

  it.each(["\\text{si}", "\\mathrm{m\\,s^{-1}}", "a \\& b", "\\{ x \\}", "\\text x"])(
    "admite %s",
    (tex) => {
      expect(construccionesNoAdmitidas(tex)).toEqual([]);
    },
  );
});

describe("delimitadoresSinPareja (E13)", () => {
  it("acepta pares, anidados y mezclados", () => {
    expect(
      delimitadoresSinPareja(
        "\\left[ 0, 1 \\right) \\left( \\left\\langle a \\middle| b \\right\\rangle \\right.",
      ),
    ).toEqual([]);
  });

  it("marca \\left sin \\right, \\right sin \\left y \\middle suelto", () => {
    expect(delimitadoresSinPareja("\\left( x").map((h) => h.pos)).toEqual([0]);
    expect(delimitadoresSinPareja("x \\right)").map((h) => h.pos)).toEqual([2]);
    expect(delimitadoresSinPareja("\\middle|")).toHaveLength(1);
  });

  it("no confunde \\leftarrow ni \\rightarrow", () => {
    expect(delimitadoresSinPareja("a \\leftarrow b \\rightarrow c")).toEqual([]);
  });
});

describe("estimarGlifos (W03)", () => {
  it.each([
    ["x = 5", 3],
    ["\\frac{1}{2}", 3],
    ["\\sqrt{x}", 2],
    ["\\left( x \\right.", 2],
    ["\\sin x", 4],
    ["a\\,b\\quad c", 3],
    ["\\id{dos}{2}", 1],
    ["\\mathrm{kg}", 2],
    ["\\comm{A}{B}", 5],
    ["\\tensor{T}{^\\mu_\\nu}", 3],
  ])("%s ≈ %i", (tex, n) => {
    expect(estimarGlifos(tex)).toBe(n);
  });
});

describe("extraerSimbolos (W05)", () => {
  const simbolos = (tex: string) => extraerSimbolos(tex).map((s) => s.simbolo);

  it("letras y griegas en la base, con subíndice simple", () => {
    expect(simbolos("\\frac{G M m}{r^2} = m \\omega^2 r + v_0 + x_{12} + \\theta_\\mu")).toEqual([
      "G",
      "M",
      "m",
      "r",
      "m",
      "\\omega",
      "r",
      "v_0",
      "x_12",
      "\\theta_\\mu",
    ]);
  });

  it("omite scripts, texto recto, \\pi, diferenciales e \\id", () => {
    expect(simbolos("e^{i k x} + T^{\\mu}{}_{\\nu}")).toEqual(["e", "T"]);
    expect(simbolos("\\mathrm{d}t + \\mathrm m + \\text{si } a")).toEqual(["t", "a"]);
    expect(simbolos("2\\pi r")).toEqual(["r"]);
    expect(simbolos("\\frac{d^2\\psi}{dx^2} + \\frac{d}{dx} + d\\theta")).toEqual([
      "\\psi",
      "x",
      "x",
      "\\theta",
    ]);
    expect(simbolos("\\id{ms}{m} + \\sin(kx) + \\tensor{T}{^a_b}")).toEqual(["m", "k", "x", "T"]);
  });

  it("una d sola es símbolo", () => {
    expect(simbolos("d + 1")).toEqual(["d"]);
  });

  it("normalizarSimbolo quita espacios y llaves del subíndice", () => {
    expect(normalizarSimbolo(" v_{0} ")).toBe("v_0");
    expect(normalizarSimbolo("\\theta")).toBe("\\theta");
  });
});
