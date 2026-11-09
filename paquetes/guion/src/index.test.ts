import { describe, expect, it } from "vitest";
import { esFormatoAdmitido, FORMATOS_ADMITIDOS } from "./index.ts";

describe("esFormatoAdmitido", () => {
  it("acepta tiza/0.1 y tiza/0.2", () => {
    for (const formato of FORMATOS_ADMITIDOS) {
      expect(esFormatoAdmitido(formato)).toBe(true);
    }
  });

  it("rechaza otras versiones", () => {
    expect(esFormatoAdmitido("tiza/1.0")).toBe(false);
    expect(esFormatoAdmitido("")).toBe(false);
  });
});
