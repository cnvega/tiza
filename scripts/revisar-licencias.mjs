#!/usr/bin/env node
// Revisa que todas las dependencias instaladas cumplan D12 (ADR 0001):
// solo MIT, BSD, ISC, Apache-2.0 o MPL-2.0.
//
// Usa `pnpm licenses list --json` (pnpm es MIT), así que no agrega
// dependencias propias. Entiende expresiones SPDX con OR, AND y paréntesis:
// «A OR B» pasa si alguna pasa; «A AND B», si pasan ambas.
//
// Uso: node scripts/revisar-licencias.mjs
//      node scripts/revisar-licencias.mjs --json archivo.json   (pruebas)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Identificadores SPDX permitidos por D12. */
export const PERMITIDAS = new Set([
  "MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "ISC",
  "Apache-2.0",
  "MPL-2.0",
]);

/** Devuelve true si la expresión SPDX queda cubierta por PERMITIDAS. */
export function expresionPermitida(expresion) {
  const fichas = expresion
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let i = 0;

  // o := y ("OR" y)*   ;   y := atomo ("AND" atomo)*   ;   atomo := ID | "(" o ")"
  function o() {
    let valor = y();
    while (fichas[i] === "OR") {
      i++;
      const otro = y();
      valor = valor || otro;
    }
    return valor;
  }
  function y() {
    let valor = atomo();
    while (fichas[i] === "AND") {
      i++;
      const otro = atomo();
      valor = valor && otro;
    }
    return valor;
  }
  function atomo() {
    const ficha = fichas[i++];
    if (ficha === "(") {
      const valor = o();
      if (fichas[i++] !== ")") throw new Error(`paréntesis sin cerrar en «${expresion}»`);
      return valor;
    }
    if (ficha === undefined) throw new Error(`expresión incompleta: «${expresion}»`);
    // «WITH excepción» no amplía lo permitido: se evalúa la licencia base.
    if (fichas[i] === "WITH") i += 2;
    return PERMITIDAS.has(ficha);
  }

  try {
    const valor = o();
    return i === fichas.length && valor;
  } catch {
    return false;
  }
}

function leerLicencias() {
  const indice = process.argv.indexOf("--json");
  if (indice !== -1) {
    const archivo = process.argv[indice + 1];
    if (!archivo) throw new Error("falta el archivo después de --json");
    return JSON.parse(readFileSync(archivo, "utf8"));
  }
  const salida = execFileSync("pnpm", ["licenses", "list", "--json"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(salida);
}

function principal() {
  const porLicencia = leerLicencias();
  const rechazadas = [];
  let total = 0;
  for (const [licencia, paquetes] of Object.entries(porLicencia)) {
    for (const paquete of paquetes) {
      total++;
      if (!expresionPermitida(licencia)) {
        const versiones = (paquete.versions ?? []).join(", ");
        rechazadas.push(`  ${paquete.name}@${versiones}: ${licencia}`);
      }
    }
  }
  if (rechazadas.length > 0) {
    console.error(`Dependencias fuera de D12 (${rechazadas.length} de ${total}):`);
    console.error(rechazadas.join("\n"));
    console.error("Permitidas: " + [...PERMITIDAS].join(", "));
    process.exit(1);
  }
  console.log(`Licencias OK: ${total} paquetes, todos dentro de D12.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  principal();
}
