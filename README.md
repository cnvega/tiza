# Tiza

Pizarra virtual animada para matemáticas y física: desarrollos paso a paso con efecto pizarrón, para clases en vivo y grabadas.

El docente escribe una derivación como guion `.tiza` (Markdown con LaTeX, un bloque por paso). Tiza la anima como en un pizarrón: los términos se mueven, cambian de lado, se cancelan y se escriben con tiza, a la velocidad que elija el docente o al ritmo de sus clics.

## Estado

Fase 0 (prueba de concepto). El prototipo de una página está en [`apps/prototipo/`](apps/prototipo/).

## Documentos

| Documento | Para qué |
| --- | --- |
| [Propuesta técnica](https://claude.ai/artifact/Pr3v3RUE9W86fmLdge6yN3) | Fundamentación, requisitos, arquitectura y plan |
| [`docs/coordinacion.md`](docs/coordinacion.md) | Decisiones fijadas, contratos, frentes de trabajo y protocolo de sesiones |
| [`docs/spec/tiza-formato.md`](docs/spec/tiza-formato.md) | Especificación del formato de guion `.tiza` v0.1 |
| [`docs/estado.md`](docs/estado.md) | Qué está en curso y quién lo tiene |
| [`corpus/`](corpus/) | Guiones de ejemplo y de prueba |

## Guion de ejemplo

```markdown
---
formato: tiza/0.1
titulo: Despeje lineal
---

## Ecuación inicial
$$ 3x + 5 = 20 $$

## El 5 pasa restando
:: pasar 5 der
$$ 3x = 20 - 5 $$
```

## Desarrollo

Requisitos: Node 22 LTS (ver `.nvmrc`) y pnpm 10 (`corepack enable` lo activa con la versión de `packageManager`).

```sh
pnpm install            # instala todo el monorepo
pnpm test               # pruebas de todos los paquetes (Vitest) y de scripts/
pnpm -r test            # solo las pruebas de los paquetes
pnpm tipos              # revisión de tipos (tsc --noEmit) en cada paquete
pnpm lint               # ESLint
pnpm formato            # aplica Prettier (pnpm formato:revisar solo revisa)
pnpm licencias          # falla si alguna dependencia está fuera de D12
pnpm revisar            # todo lo anterior, como en el CI
pnpm --filter @tiza/guion test   # un solo paquete
```

Los paquetes viven en `paquetes/<nombre>` y las aplicaciones en `apps/<nombre>`. Cada paquete extiende `tsconfig.base.json` (TypeScript estricto) y define sus scripts `tipos` y `test`. El CI (`.github/workflows/ci.yml`) corre tipos, lint, formato, pruebas y licencias en cada PR.

## Cómo se trabaja

Cada cambio parte de un issue, se hace en una rama `w<n>/<slug>` y entra a `main` por pull request. Los detalles están en [`docs/coordinacion.md`](docs/coordinacion.md).

## Licencias

| Parte | Licencia |
| --- | --- |
| Código | [GNU AGPL v3](LICENSE) (`AGPL-3.0-only`), con [licencia comercial](LICENSE-COMMERCIAL.md) disponible |
| Especificación y documentación (`docs/`) | [CC BY 4.0](docs/LICENSE.md) |
| Corpus de guiones (`corpus/`) | [CC BY-SA 4.0](corpus/LICENSE.md) |

Usar Tiza para enseñar, en vivo o en video, gratis o pagado, no requiere licencia comercial. Detalles en [`LICENSE-COMMERCIAL.md`](LICENSE-COMMERCIAL.md). Para contribuir, ver [`CONTRIBUTING.md`](CONTRIBUTING.md) y el [CLA](CLA.md).

## Autor

Cristian A. Vega Martínez. Proyecto personal del autor.
