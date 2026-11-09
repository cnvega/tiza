import { describe, expect, it } from "vitest";
import { analizar, compilar } from "./index.ts";
import type { Diagnostico } from "./tipos.ts";

const ENCABEZADO = "---\nformato: tiza/0.2\ntitulo: Prueba\n---\n";
const guion = (cuerpo: string, encabezado = ENCABEZADO) => encabezado + "\n" + cuerpo;
const codigos = (ds: Diagnostico[]) => ds.map((d) => d.codigo);
const con = (texto: string, codigo: string) =>
  analizar(texto).diagnosticos.filter((d) => d.codigo === codigo);

describe("encabezado", () => {
  it("aplica los valores por omisión de la sección 3", () => {
    const r = analizar(guion("## A\n$$ x = 1 $$\n"));
    expect(r.diagnosticos).toEqual([]);
    expect(r.encabezado).toEqual({
      formato: "tiza/0.2",
      titulo: "Prueba",
      etiquetas: [],
      tema: "pizarron-verde",
      ritmo: 1,
      pizarra: "lineas",
      alinear: "=",
      idioma: "es",
      paquetes: [],
      macros: "",
      supuestos: { positivos: [], reales: [], "no-nulos": [] },
    });
  });

  it("lee todas las claves", () => {
    const enc =
      "---\nformato: tiza/0.1\ntitulo: T\ncurso: Física\netiquetas: [a, b]\ntema: pizarra-blanca\n" +
      'ritmo: 1.5\npizarra: en-lugar\nalinear: "\\\\approx"\nidioma: en\npaquetes: []\n' +
      "macros: |\n  \\newcommand{\\dd}{\\mathrm{d}}\nsupuestos:\n  positivos: [r]\n  reales: [x]\n  no-nulos: [v_0]\n---\n";
    const r = analizar(guion("## A\n$$ r = x v_0 $$\n", enc));
    expect(r.diagnosticos).toEqual([]);
    expect(r.encabezado).toMatchObject({
      formato: "tiza/0.1",
      curso: "Física",
      etiquetas: ["a", "b"],
      tema: "pizarra-blanca",
      ritmo: 1.5,
      pizarra: "en-lugar",
      alinear: "\\approx",
      idioma: "en",
      macros: "\\newcommand{\\dd}{\\mathrm{d}}\n",
      supuestos: { positivos: ["r"], reales: ["x"], "no-nulos": ["v_0"] },
    });
  });

  it("E01 sin encabezado, sin cierre, con YAML inválido o sin formato", () => {
    expect(codigos(analizar("## A\n$$ x $$").diagnosticos)).toEqual(["E01"]);
    expect(codigos(analizar("---\nformato: tiza/0.2\n").diagnosticos)).toEqual(["E01"]);
    const yaml = analizar("---\nformato: [\n---\n## A\n$$ x $$\n");
    expect(codigos(yaml.diagnosticos)).toContain("E01");
    expect(yaml.encabezado).toBeNull();
    expect(codigos(analizar("---\ntitulo: T\n---\n## A\n$$ x $$\n").diagnosticos)).toEqual(["E01"]);
    expect(codigos(analizar("---\n- a\n---\n## A\n$$ x $$\n").diagnosticos)).toContain("E01");
  });

  it("E02 con otro formato, en la línea de la clave", () => {
    const [d] = con("---\ntitulo: T\nformato: tiza/1.0\n---\n## A\n$$ x $$\n", "E02");
    expect(d).toMatchObject({ nivel: "error", linea: 3, columna: 1 });
  });

  it("E03 sin titulo o con titulo vacío", () => {
    expect(con("---\nformato: tiza/0.2\n---\n## A\n$$ x $$\n", "E03")).toHaveLength(1);
    expect(con('---\nformato: tiza/0.2\ntitulo: ""\n---\n## A\n$$ x $$\n', "E03")).toHaveLength(1);
  });

  it("W01 por clave desconocida, pero no por prueba", () => {
    const r = analizar(
      guion(
        "## A\n$$ x $$\n",
        "---\nformato: tiza/0.2\ntitulo: T\nautor: Ana\nprueba:\n  esperado: ok\n  cubre: [a]\n  objetivo: o\n---\n",
      ),
    );
    expect(r.diagnosticos).toHaveLength(1);
    expect(r.diagnosticos[0]).toMatchObject({ codigo: "W01", nivel: "advertencia", linea: 4 });
    expect(r.prueba).toEqual({ esperado: "ok", cubre: ["a"], objetivo: "o" });
  });

  it("W01 y valor por omisión con valores no válidos", () => {
    const enc =
      "---\nformato: tiza/0.2\ntitulo: T\ntema: rosado\nritmo: 9\npizarra: x\nalinear: '~'\n" +
      "idioma: fr\netiquetas: 3\nmacros: [a]\nsupuestos: [x]\npaquetes: [physics, tikz]\n---\n";
    const r = analizar(guion("## A\n$$ x $$\n", enc));
    expect(codigos(r.diagnosticos).filter((c) => c === "W01")).toHaveLength(9);
    expect(codigos(r.diagnosticos)).toContain("W08");
    expect(r.encabezado).toMatchObject({
      tema: "pizarron-verde",
      ritmo: 1,
      pizarra: "lineas",
      alinear: "=",
      idioma: "es",
      etiquetas: [],
      macros: "",
      paquetes: ["physics"],
    });
  });

  it("W01 por clave desconocida en supuestos", () => {
    const enc = "---\nformato: tiza/0.2\ntitulo: T\nsupuestos:\n  enteros: [n]\n---\n";
    expect(con(guion("## A\n$$ x $$\n", enc), "W01")).toHaveLength(1);
  });

  it("W08 con paquetes: [physics], en la línea de paquetes", () => {
    const enc = "---\nformato: tiza/0.2\ntitulo: T\npaquetes: [physics]\n---\n";
    const [d] = con(guion("## A\n$$ \\qty(x) $$\n", enc), "W08");
    expect(d).toMatchObject({ linea: 4, columna: 1 });
    // también con paquetes como texto suelto
    expect(con(guion("## A\n$$ x $$\n", enc.replace("[physics]", "physics")), "W08")).toHaveLength(
      1,
    );
  });
});

describe("pasos", () => {
  it("compila el ejemplo de la sección 9", () => {
    const r = analizar(
      guion(
        "## A\n$$ \\frac{G M}{r} = \\frac{4\\pi^2 r^2}{T^2} $$\n\n" +
          "## T² pasa multiplicando\n:: pasar T^2 izq\n$$ \\frac{G M}{r}\\, T^2 = 4\\pi^2 r^2 $$\n" +
          "> El período al cuadrado sale del denominador\n> y pasa multiplicando.\n",
      ),
    );
    expect(r.diagnosticos).toEqual([]);
    expect(r.pasos[1]).toEqual({
      id: "p2",
      titulo: "T² pasa multiplicando",
      latex: "\\frac{G M}{r}\\, T^2 = 4\\pi^2 r^2",
      modo: "nueva-linea",
      ids: [],
      compases: [
        {
          posicion: "previa",
          linea: 10,
          acciones: [{ verbo: "pasar", objetivos: ["T^2"], lado: "izq" }],
        },
      ],
      narracion: "El período al cuadrado sale del denominador y pasa multiplicando.",
      linea: 9,
    });
  });

  it("une la fórmula multilínea con espacios", () => {
    const r = analizar(guion("## A\n$$ x\n  = \\frac{1}\n{2}\n$$\n"));
    expect(r.diagnosticos).toEqual([]);
    expect(r.pasos[0]?.latex).toBe("x   = \\frac{1} {2}");
  });

  it("fórmula que cierra en la misma línea que su última parte", () => {
    const r = analizar(guion("## A\n$$\nx = 1 $$\n"));
    expect(r.pasos[0]?.latex).toBe("x = 1");
  });

  it("acepta CRLF, BOM y comentarios HTML sin mover líneas ni columnas", () => {
    const texto =
      "\uFEFF" +
      guion("<!-- nota\nlarga -->\n## A <!-- x -->\n$$ \\left( x $$\n").replace(/\n/g, "\r\n");
    const r = analizar(texto);
    expect(r.pasos[0]).toMatchObject({ titulo: "A", linea: 8 });
    expect(r.diagnosticos[0]).toMatchObject({ codigo: "E13", linea: 9, columna: 4 });
  });

  it("modo: pizarra, en-lugar y nueva-linea; el primer paso siempre nueva-linea", () => {
    const cuerpo =
      "## A\n:: en-lugar\n$$ x = 1 $$\n## B\n$$ x = 2 $$\n## C\n:: en-lugar\n$$ x = 3 $$\n" +
      "## D\n:: nueva-linea + pausa 1\n$$ x = 4 $$\n";
    const lineas = analizar(guion(cuerpo)).pasos.map((p) => p.modo);
    expect(lineas).toEqual(["nueva-linea", "nueva-linea", "en-lugar", "nueva-linea"]);
    const enc = ENCABEZADO.replace("---\n\n", "").replace(
      "titulo: Prueba",
      "titulo: P\npizarra: en-lugar",
    );
    const r = analizar(guion(cuerpo, enc));
    expect(r.pasos.map((p) => p.modo)).toEqual([
      "nueva-linea",
      "en-lugar",
      "en-lugar",
      "nueva-linea",
    ]);
    // en-lugar y nueva-linea no quedan en compases; pausa sí
    expect(r.pasos[0]?.compases).toEqual([]);
    expect(r.pasos[3]?.compases[0]?.acciones).toEqual([{ verbo: "pausa", segundos: 1 }]);
  });

  it("compases previos y posteriores, con + y en orden", () => {
    const r = analizar(
      guion(
        "## A\n$$ a + b = c $$\n## B\n:: resaltar a + pausa 0.5\n:: cancelar a\n$$ b = c $$\n:: recuadro\n",
      ),
    );
    const p = r.pasos[1];
    expect(p?.compases.map((c) => [c.posicion, c.linea, c.acciones.length])).toEqual([
      ["previa", 9, 2],
      ["previa", 10, 1],
      ["posterior", 12, 1],
    ]);
  });

  it("ids en orden de lectura", () => {
    const r = analizar(guion("## A\n$$ \\id{a}{x} + \\id{b-2}{\\id{c}{y}} = 0 $$\n"));
    expect(r.pasos[0]?.ids).toEqual(["a", "b-2", "c"]);
  });

  it("E04 sin pasos o con primer paso sin fórmula", () => {
    expect(codigos(analizar(ENCABEZADO).diagnosticos)).toEqual(["E04"]);
    expect(codigos(analizar(guion("## A\n:: resaltar x\n## B\n$$ x $$\n")).diagnosticos)).toEqual([
      "E04",
    ]);
    expect(codigos(analizar(guion("## A\n$$  $$\n")).diagnosticos)).toEqual(["E04"]);
  });

  it("E06 con dos fórmulas", () => {
    const [d] = con(guion("## A\n$$ x $$\n$$ y $$\n"), "E06");
    expect(d).toMatchObject({ linea: 8, columna: 1 });
  });

  it("E07 por construcciones no admitidas, con línea y columna", () => {
    const r = analizar(guion("## A\n$$ x \\\\ y $$\n## B\n$$ a\n& \\begin{x} $$\n"));
    expect(r.diagnosticos.map((d) => [d.codigo, d.linea, d.columna])).toEqual([
      ["E07", 7, 6],
      ["E07", 10, 1],
      ["E07", 10, 3],
    ]);
  });

  it("E07 por fórmula sin cierre", () => {
    expect(codigos(analizar(guion("## A\n$$ x = 1\n")).diagnosticos)).toEqual(["E07"]);
  });

  it("E08 por verbo desconocido o firma que no calza", () => {
    const r = analizar(guion("## A\n$$ x $$\n## B\n:: mover x\n:: pasar x arriba\n$$ y $$\n"));
    expect(r.diagnosticos.map((d) => [d.codigo, d.linea, d.columna])).toEqual([
      ["E08", 9, 4],
      ["E08", 10, 12],
    ]);
  });

  it("E08 por línea :: vacía", () => {
    expect(codigos(analizar(guion("## A\n$$ x $$\n::\n")).diagnosticos)).toEqual(["E08"]);
  });

  it("E08 por posición: recuadro antes de la fórmula, pasar después", () => {
    const r = analizar(guion("## A\n$$ x $$\n## B\n:: recuadro\n$$ y $$\n:: pasar y der\n"));
    expect(codigos(r.diagnosticos)).toEqual(["W02", "E08", "E08"]);
  });

  it("paso sin fórmula: solo marcas, sin latex ni ids", () => {
    const r = analizar(guion("## A\n$$ x $$\n##\n:: resaltar x + pausa 2\n## C\n:: cancelar x\n"));
    expect(r.pasos[1]).toMatchObject({ titulo: "", latex: null, ids: [] });
    expect(codigos(r.diagnosticos)).toEqual(["E08"]);
    expect(r.diagnosticos[0]?.linea).toBe(11);
  });

  it("E11 por \\id inválido, repetido o sin expresión", () => {
    const r = analizar(
      guion(
        "## A\n$$ \\id{Ab}{x} + \\id{a}{y} + \\id{a}{z} + \\id{b} + \\id{" +
          "x".repeat(25) +
          "}{w} $$\n",
      ),
    );
    expect(codigos(r.diagnosticos)).toEqual(["E11", "E11", "E11", "E11"]);
    expect(r.pasos[0]?.ids).toEqual(["a"]);
  });

  it("E12 por transformación previa en el primer paso", () => {
    expect(codigos(analizar(guion("## A\n:: pasar x der\n$$ x $$\n")).diagnosticos)).toEqual([
      "E12",
    ]);
    // resaltar antes de la primera fórmula sí se puede
    expect(analizar(guion("## A\n:: resaltar x\n$$ x $$\n")).diagnosticos).toEqual([]);
  });

  it("E13 por \\left o \\right sin pareja y \\middle suelto", () => {
    const r = analizar(guion("## A\n$$ \\left( x \\right) \\right] \\middle| \\left[ $$\n"));
    expect(codigos(r.diagnosticos)).toEqual(["E13", "E13", "E13"]);
  });

  it("W00 por líneas fuera de la gramática", () => {
    const r = analizar(guion("texto suelto\n## A\n$$ x $$ cola\nmás texto\n"));
    expect(r.diagnosticos.map((d) => [d.codigo, d.linea])).toEqual([
      ["W00", 6],
      ["W00", 8],
      ["W00", 9],
    ]);
  });

  it("W02 por acción de la v1.0, según el conjunto implementado", () => {
    const texto = guion("## A\n$$ x $$\n## B\n:: expandir\n$$ y $$\n:: recuadro\n");
    expect(codigos(analizar(texto).diagnosticos)).toEqual(["W02", "W02"]);
    const conRecuadro = new Set(["recuadro"]);
    expect(codigos(analizar(texto, { implementados: conRecuadro }).diagnosticos)).toEqual(["W02"]);
  });

  it("W03 con más de 60 glifos", () => {
    const larga = Array.from({ length: 31 }, (_, i) => `a_${i}`).join("+");
    expect(con(guion(`## A\n$$ x = ${larga} $$\n`), "W03")).toHaveLength(1);
    expect(con(guion("## A\n$$ x = a + b $$\n"), "W03")).toHaveLength(0);
    expect(
      analizar(guion("## A\n$$ x = a + b $$\n"), { maxGlifos: 3 }).diagnosticos[0]?.codigo,
    ).toBe("W03");
  });

  it("W04 con más de 12 pasos, en el paso 13", () => {
    const cuerpo = Array.from({ length: 13 }, (_, i) => `## P${i + 1}\n$$ x = ${i} $$\n`).join("");
    const [d] = con(guion(cuerpo), "W04");
    expect(d?.linea).toBe(6 + 12 * 2);
  });

  it("W05 con símbolos fuera de supuestos, solo si hay supuestos", () => {
    const enc =
      "---\nformato: tiza/0.2\ntitulo: T\nsupuestos:\n  positivos: [m, v_0, \\theta]\n---\n";
    const [d] = con(
      guion("## A\n$$ m v_0 \\sin\\theta = \\mathrm{kg}\\, x + v_1 + \\pi $$\n", enc),
      "W05",
    );
    expect(d?.mensaje).toContain("x, v_1");
    expect(d?.mensaje).not.toContain("kg");
    expect(con(guion("## A\n$$ y = x $$\n"), "W05")).toHaveLength(0);
  });

  it("ordena los diagnósticos por línea y columna", () => {
    const r = analizar(
      guion(
        "## A\n$$ x \\\\ & $$\n## B\n:: mover\n$$ y $$\n",
        "---\nformato: tiza/0.2\ntitulo: T\nx: 1\n---\n",
      ),
    );
    const pos = r.diagnosticos.map((d) => d.linea * 1000 + d.columna);
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
  });

  it("nunca lanza con entradas raras", () => {
    for (const t of [
      "",
      "---",
      "---\n---",
      "---\n---\n##",
      '---\nformato: tiza/0.2\ntitulo: T\n---\n## A\n$$ \\id{ $$\n:: "\n',
    ]) {
      expect(() => analizar(t)).not.toThrow();
    }
  });
});

describe("compilar", () => {
  it("devuelve null si hay errores", () => {
    expect(compilar(guion("## A\n$$ \\left( $$\n")).guion).toBeNull();
  });

  it("devuelve el GuionCompilado si no hay errores", () => {
    const { guion: g } = compilar(guion("## A\n$$ x $$\n"));
    expect(g?.pasos).toHaveLength(1);
    expect(g?.titulo).toBe("Prueba");
  });
});
