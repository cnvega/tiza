# esquemas/

JSON Schema (2020-12) de los contratos entre paquetes (ver `docs/coordinacion.md`, sección 4). Cambiar un esquema es cambiar un contrato: PR propio con ADR en `docs/adr/` y aprobación de Cris.

| Contrato | Esquema | Ejemplos | ADR |
| --- | --- | --- | --- |
| C2 `GuionCompilado` / `PasoCompilado[]` | `paso-compilado.schema.json` | `ejemplos/paso-compilado/` | 0003 |

C3–C5 esperan la prueba en sala de F0. Cada esquema trae al menos tres ejemplos válidos, nombrados `<categoria>-<nn>-<slug>.json` según el guion de `corpus/` del que salen.
