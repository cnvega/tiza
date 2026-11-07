# Cómo contribuir a Tiza

## Antes de empezar

1. Lee [`docs/coordinacion.md`](docs/coordinacion.md) y [`docs/estado.md`](docs/estado.md).
2. Trabaja a partir de un issue y en una rama `w<n>/<slug-corto>` desde `main`.
3. Abre un pull request con el issue enlazado, qué cambió y cómo se probó.

## Licencias

| Parte del repositorio | Licencia |
| --- | --- |
| Código (`paquetes/`, `apps/`, `esquemas/` y todo lo que no esté en las filas siguientes) | AGPLv3 (`AGPL-3.0-only`), con licencia comercial dual del titular |
| Especificación y documentación (`docs/`, `*.md` de la raíz salvo `LICENSE*`) | CC BY 4.0 |
| Corpus de guiones (`corpus/`) | CC BY-SA 4.0 |

Al contribuir, tu aporte queda disponible bajo la licencia de la parte que toques.

## Acuerdo de contribución (CLA)

Para que el titular pueda seguir ofreciendo la licencia comercial, **toda contribución externa requiere aceptar el [CLA](CLA.md)**. No cedes la propiedad de tu aporte: otorgas una licencia amplia que permite distribuirlo bajo la AGPLv3 y bajo licencia comercial.

Para aceptarlo, comenta en tu pull request:

> Acepto el CLA de Tiza, versión 1.0.

Si contribuyes como estudiante, ayudante o trabajador pagado por una institución (por ejemplo, un proyecto universitario), necesitas su autorización escrita o su confirmación de que no reclama derechos sobre tu aporte (sección 4 del CLA).

## Dependencias

Solo se aceptan dependencias con licencias permisivas o de copyleft débil a nivel de archivo: MIT, BSD, ISC, Apache-2.0 o MPL-2.0. No se aceptan dependencias GPL, AGPL o LGPL de terceros, licencias propietarias ni licencias que prohíban el uso comercial (decisión D12).

## Estilo

Commits pequeños en español con el formato `paquete: verbo en presente`. Código, comentarios, issues y documentación en español.
