import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatear, listarGuiones, principal, validarArchivo } from "./cli.ts";
import { cumpleEsperado, leerEsperado } from "./esperado.ts";
import type { Diagnostico } from "./tipos.ts";

const BUENO = "---\nformato: tiza/0.2\ntitulo: T\nprueba:\n  esperado: ok\n---\n## A\n$$ x $$\n";
const MALO =
  "---\nformato: tiza/0.2\ntitulo: T\nprueba:\n  esperado: error:E13\n---\n## A\n$$ \\left( $$\n";
const SIN_PRUEBA = "---\nformato: tiza/0.2\ntitulo: T\n---\n## A\n$$ x $$\n";

function carpeta(archivos: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "tiza-"));
  for (const [nombre, texto] of Object.entries(archivos)) {
    const ruta = join(dir, nombre);
    mkdirSync(join(ruta, ".."), { recursive: true });
    writeFileSync(ruta, texto);
  }
  return dir;
}

function correr(argv: string[]): { codigo: number; salida: string } {
  const partes: string[] = [];
  const codigo = principal(argv, (s) => partes.push(s));
  return { codigo, salida: partes.join("\n") };
}

describe("tiza validar", () => {
  it("lista .tiza en carpetas, recursivo y ordenado", () => {
    const dir = carpeta({ "b/2.tiza": BUENO, "a.tiza": BUENO, "c.md": "x", "b/1.tiza": BUENO });
    expect(listarGuiones([dir]).map((r) => r.slice(dir.length + 1))).toEqual([
      "a.tiza",
      "b/1.tiza",
      "b/2.tiza",
    ]);
  });

  it("sale con 0 sin errores y con 1 si hay errores", () => {
    const dir = carpeta({ "bueno.tiza": BUENO, "malo.tiza": MALO });
    expect(correr(["validar", join(dir, "bueno.tiza")]).codigo).toBe(0);
    const r = correr(["validar", dir]);
    expect(r.codigo).toBe(1);
    expect(r.salida).toMatch(/malo\.tiza:8:4 {2}error {2}E13/);
    expect(r.salida).toContain("2 guiones; 1 con errores.");
  });

  it("--esperado compara con prueba.esperado", () => {
    const dir = carpeta({ "bueno.tiza": BUENO, "malo.tiza": MALO });
    const r = correr(["validar", "--esperado", dir]);
    expect(r.codigo).toBe(0);
    expect(r.salida).toContain("✓ error:E13");
    const sin = carpeta({ "sin.tiza": SIN_PRUEBA, "raro.tiza": BUENO.replace("ok", "bien") });
    const r2 = correr(["validar", "--esperado", sin]);
    expect(r2.codigo).toBe(1);
    expect(r2.salida).toContain("falta prueba.esperado");
    expect(r2.salida).toContain("esperado ilegible «bien»");
  });

  it("--json escribe un arreglo por archivo", () => {
    const dir = carpeta({ "malo.tiza": MALO });
    const r = correr(["validar", "--json", "--esperado", dir]);
    const datos = JSON.parse(r.salida) as {
      errores: number;
      cumple: boolean;
      diagnosticos: Diagnostico[];
    }[];
    expect(datos).toHaveLength(1);
    expect(datos[0]).toMatchObject({ errores: 1, cumple: true, esperado: "error:E13" });
    expect(datos[0]?.diagnosticos[0]?.codigo).toBe("E13");
  });

  it("ayuda y errores de uso", () => {
    expect(correr(["--help"]).codigo).toBe(0);
    expect(correr([]).codigo).toBe(2);
    expect(correr(["validar"]).codigo).toBe(2);
    expect(correr(["validar", "--nada", "x"]).codigo).toBe(2);
    expect(correr(["validar", "/no/existe.tiza"]).codigo).toBe(2);
  });

  it("formatear y validarArchivo", () => {
    const dir = carpeta({ "a.tiza": BUENO });
    const r = validarArchivo(join(dir, "a.tiza"), false);
    expect(r).toMatchObject({ errores: 0, advertencias: 0 });
    expect(r.cumple).toBeUndefined();
    expect(formatear([r], dir)).toBe("a.tiza: 0 errores, 0 advertencias");
  });
});

describe("esperado", () => {
  const d = (codigo: Diagnostico["codigo"]): Diagnostico => ({
    codigo,
    nivel: codigo.startsWith("E") ? "error" : "advertencia",
    mensaje: "",
    linea: 1,
    columna: 1,
  });

  it("leerEsperado", () => {
    expect(leerEsperado("ok")).toEqual({ tipo: "ok" });
    expect(leerEsperado("advertencia:W02")).toEqual({ tipo: "advertencia", codigo: "W02" });
    expect(leerEsperado("error: E13")).toEqual({ tipo: "error", codigo: "E13" });
    expect(leerEsperado("error:W02")).toBeNull();
    expect(leerEsperado("advertencia:E01")).toBeNull();
    expect(leerEsperado("quizás")).toBeNull();
  });

  it("cumpleEsperado", () => {
    expect(cumpleEsperado({ tipo: "ok" }, [d("W02")]).cumple).toBe(true);
    expect(cumpleEsperado({ tipo: "ok" }, [d("E04")]).cumple).toBe(false);
    expect(
      cumpleEsperado({ tipo: "advertencia", codigo: "W02" }, [d("W02"), d("W05")]).cumple,
    ).toBe(true);
    expect(cumpleEsperado({ tipo: "advertencia", codigo: "W02" }, [d("W05")]).motivo).toContain(
      "falta",
    );
    expect(
      cumpleEsperado({ tipo: "advertencia", codigo: "W02" }, [d("W02"), d("E08")]).cumple,
    ).toBe(false);
    expect(cumpleEsperado({ tipo: "error", codigo: "E13" }, [d("E13"), d("E07")]).cumple).toBe(
      true,
    );
    expect(cumpleEsperado({ tipo: "error", codigo: "E13" }, [d("E07")]).cumple).toBe(false);
  });
});
