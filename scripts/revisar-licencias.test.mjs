import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { expresionPermitida } from "./revisar-licencias.mjs";

const guion = fileURLToPath(new URL("./revisar-licencias.mjs", import.meta.url));

test("acepta las licencias de D12", () => {
  for (const id of ["MIT", "ISC", "Apache-2.0", "MPL-2.0", "BSD-2-Clause", "BSD-3-Clause"]) {
    assert.equal(expresionPermitida(id), true, id);
  }
});

test("rechaza licencias fuera de D12", () => {
  for (const id of ["GPL-3.0-only", "AGPL-3.0-only", "LGPL-2.1", "BlueOak-1.0.0", "Unknown", ""]) {
    assert.equal(expresionPermitida(id), false, id);
  }
});

test("evalúa OR, AND y paréntesis", () => {
  assert.equal(expresionPermitida("(MIT OR GPL-3.0-only)"), true);
  assert.equal(expresionPermitida("MIT AND GPL-3.0-only"), false);
  assert.equal(expresionPermitida("(MIT AND ISC) OR GPL-2.0"), true);
  assert.equal(expresionPermitida("Apache-2.0 WITH LLVM-exception"), true);
  assert.equal(expresionPermitida("(MIT"), false);
});

function correr(datos) {
  const dir = mkdtempSync(join(tmpdir(), "licencias-"));
  const archivo = join(dir, "l.json");
  writeFileSync(archivo, JSON.stringify(datos));
  try {
    execFileSync("node", [guion, "--json", archivo], { stdio: "pipe" });
    return 0;
  } catch (error) {
    return error.status;
  }
}

test("falla con una dependencia GPL y pasa sin ella", () => {
  const mit = [{ name: "a", versions: ["1.0.0"] }];
  assert.equal(correr({ MIT: mit }), 0);
  assert.equal(correr({ MIT: mit, "GPL-3.0-only": [{ name: "b", versions: ["2.0.0"] }] }), 1);
});
