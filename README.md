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

## Cómo se trabaja

Cada cambio parte de un issue, se hace en una rama `w<n>/<slug>` y entra a `main` por pull request. Los detalles están en [`docs/coordinacion.md`](docs/coordinacion.md).

## Licencia

GNU GPL v3. Ver [`LICENSE`](LICENSE).

## Autor

Cristian Vega (Universidad Central de Chile).
