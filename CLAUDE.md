# Instrucciones para Claude en este repositorio

Antes de cambiar nada, lee `docs/coordinacion.md` y `docs/estado.md`. Si tu tarea toca el formato de guion, lee `docs/spec/tiza-formato.md`.

## Reglas

- Trabaja siempre a partir de un issue. Si no existe, créalo con: frente (W0–W9), objetivo, contratos que toca y criterio de aceptación.
- Una rama por issue: `w<n>/<slug-corto>` desde `main`. Nunca hagas commit directo a `main`.
- No edites paquetes fuera de tu frente. Si necesitas algo de otro frente, abre un issue y usa datos de prueba.
- Los contratos (C1–C6) solo cambian por un PR propio con ADR en `docs/adr/`, y los aprueba Cris. No hagas merge de esos PR.
- Commits pequeños en español: `paquete: verbo en presente` (ej. `emparejar: agrega costo por cambio de escala`).
- Al terminar: PR con el issue enlazado, qué cambió, cómo se probó y capturas si es visual; comenta el estado en el issue y actualiza `docs/estado.md`.
- Cada error corregido deja un caso de prueba en `corpus/` o en las pruebas del paquete.

## Convenciones

- TypeScript estricto, pnpm workspaces, Node 22 LTS (cuando exista el andamiaje de W0).
- Guiones `.tiza` en `corpus/<categoria>/<nn>-<slug>.tiza`, con bloque `prueba` en el encabezado.
- Idioma del código, comentarios, issues y documentación: español.
- Licencias (D12, ADR 0001): no agregues dependencias que no sean MIT, BSD, ISC, Apache-2.0 o MPL-2.0. No copies código de terceros sin verificar su licencia. Los PR externos requieren aceptar el CLA (`CLA.md`).
