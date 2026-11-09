/**
 * Corpus y contrato C2: cada guion de `corpus/` cumple su `esperado`, la salida valida contra
 * `esquemas/paso-compilado.schema.json` y coincide con los ejemplos de `esquemas/ejemplos/`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { analizar, compilar, cumpleEsperado, leerEsperado } from "./index.ts";
import { listarGuiones } from "./cli.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORPUS = join(RAIZ, "corpus");
const ESQUEMA = JSON.parse(
  readFileSync(join(RAIZ, "esquemas/paso-compilado.schema.json"), "utf8"),
) as object;
const EJEMPLOS = join(RAIZ, "esquemas/ejemplos/paso-compilado");

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validarC2 = ajv.compile(ESQUEMA);
const guiones = listarGuiones([CORPUS]);

describe("corpus/", () => {
  it("tiene guiones", () => {
    expect(guiones.length).toBeGreaterThanOrEqual(10);
  });

  for (const archivo of guiones) {
    const nombre = relative(CORPUS, archivo);
    const r = analizar(readFileSync(archivo, "utf8"));

    it(`${nombre} cumple su esperado`, () => {
      const esperado = leerEsperado(r.prueba?.esperado ?? "");
      expect(esperado, "prueba.esperado legible").not.toBeNull();
      if (!esperado) return;
      const c = cumpleEsperado(esperado, r.diagnosticos);
      expect(c.motivo).toBe("");
      expect(c.cumple).toBe(true);
    });

    if (!r.diagnosticos.some((d) => d.nivel === "error")) {
      it(`${nombre} produce un GuionCompilado válido según C2`, () => {
        const { guion } = compilar(readFileSync(archivo, "utf8"));
        expect(guion).not.toBeNull();
        const valido = validarC2(guion);
        expect(validarC2.errors ?? []).toEqual([]);
        expect(valido).toBe(true);
      });
    }
  }
});

describe("esquemas/ejemplos/paso-compilado", () => {
  for (const json of readdirSync(EJEMPLOS).filter((n) => n.endsWith(".json"))) {
    // <categoria>-<nn>-<slug>.json ← corpus/<categoria>/<nn>-<slug>.tiza
    const [categoria, ...resto] = basename(json, ".json").split("-");
    const fuente = join(CORPUS, categoria ?? "", resto.join("-") + ".tiza");

    it(`${json} coincide con lo que produce el analizador`, () => {
      const ejemplo: unknown = JSON.parse(readFileSync(join(EJEMPLOS, json), "utf8"));
      const { guion } = compilar(readFileSync(fuente, "utf8"));
      expect(JSON.parse(JSON.stringify(guion))).toEqual(ejemplo);
      expect(validarC2(ejemplo)).toBe(true);
    });
  }
});

describe("ejemplos de la especificación (sección 10)", () => {
  const spec = readFileSync(join(RAIZ, "docs/spec/tiza-formato.md"), "utf8");
  const bloques = [...spec.matchAll(/### (10\.\d)[^\n]*\n+```markdown\n([\s\S]*?)\n```/g)];

  it("hay cuatro ejemplos", () => {
    expect(bloques.map((b) => b[1])).toEqual(["10.1", "10.2", "10.3", "10.4"]);
  });

  for (const [, num, texto] of bloques) {
    it(`${num} no tiene errores y valida contra C2`, () => {
      const { guion, diagnosticos } = compilar(texto ?? "");
      expect(diagnosticos.filter((d) => d.nivel === "error")).toEqual([]);
      expect(validarC2(guion)).toBe(true);
    });
  }
});
