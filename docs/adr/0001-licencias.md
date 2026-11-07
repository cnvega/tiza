# ADR 0001 — Licencias: AGPLv3 con licencia comercial dual, CC para formato y corpus

- Estado: propuesto (lo aprueba Cris)
- Fecha: 2026-11-07
- Reemplaza: D12 original (GPLv3)
- Issue: #3

## Contexto

D12 fijó GPLv3 para todo el repositorio. Al revisar cómo financiar el desarrollo aparecieron tres hechos:

1. **Monetización.** La GPLv3 permite donaciones y venta de binarios, pero no deja una vía de ingreso propia del titular. Además, Tiza corre en el navegador: con la GPL, un tercero puede ofrecer Tiza modificada como servicio web sin publicar sus cambios.
2. **Fondos institucionales.** El Fondo de Innovación en Docencia de la Universidad Central excluye pagos a docentes jornada y al director del proyecto, y su reglamento de propiedad industrial (Res. 6449/2020) está pensado para resultados cuya titularidad queda en la Universidad. Ninguno de los dos remunera el desarrollo como proyecto personal.
3. **Titularidad.** Según el art. 8 de la Ley 17.336, el software creado por dependientes en el desempeño de sus funciones, o por encargo, pertenece al empleador o a quien lo encarga, salvo estipulación escrita en contrario. La licencia solo es válida si la otorga el titular.

Como el repositorio es nuevo y no tiene contribuciones externas, el titular puede cambiar la licencia ahora sin coordinar con terceros.

## Decisión

| Parte | Licencia |
| --- | --- |
| Código: `paquetes/`, `apps/`, `esquemas/` y todo lo no listado abajo | **AGPLv3 solamente** (`AGPL-3.0-only`) |
| Licencia adicional para quien no quiera cumplir la AGPL | **Licencia comercial** del titular ([`LICENSE-COMMERCIAL.md`](../../LICENSE-COMMERCIAL.md)) |
| Especificación del formato y documentación (`docs/`, `*.md` de la raíz salvo `LICENSE*`) | **CC BY 4.0** |
| Corpus de guiones (`corpus/`) | **CC BY-SA 4.0** |
| Contribuciones externas | **CLA** ([`CLA.md`](../../CLA.md)): licencia amplia al titular con derecho a relicenciar; el contribuyente conserva la propiedad |

D12 queda así: *Código AGPL-3.0-only con licencia comercial dual del titular (ADR 0001); especificación y documentación CC BY 4.0; corpus CC BY-SA 4.0. Toda dependencia nueva debe ser MIT, BSD, ISC, Apache-2.0 o MPL-2.0. No se aceptan dependencias GPL, AGPL o LGPL de terceros, licencias propietarias ni licencias que prohíban el uso comercial. Las contribuciones externas requieren el CLA.*

### Razones

- **AGPL en lugar de GPL:** cierra el uso como servicio web sin compartir cambios. Para docentes y estudiantes no cambia nada: el uso sigue siendo libre y gratuito.
- **`-only` en lugar de `-or-later`:** el titular conserva el control de futuras versiones de la licencia.
- **Licencia comercial dual:** es la única vía de ingreso que no compite con el uso educativo. Su mercado son plataformas y productos que quieran integrar Tiza sin abrir su código.
- **CC BY para el formato:** mientras más herramientas adopten `.tiza`, más vale el motor.
- **CC BY-SA para el corpus:** los guiones derivados se siguen compartiendo.
- **CLA y no cesión:** basta para relicenciar y es más aceptable para contribuyentes.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| MIT o Apache-2.0 | Máxima adopción, pero sin vía de ingreso propia. Sigue siendo la opción de respaldo si la gestión del CLA resulta costosa. |
| Mantener GPLv3 | También admite licencia dual, pero no cubre el uso como servicio web, que es el escenario comercial más probable para una aplicación que corre en el navegador. |
| *Open core* | Exige mantener dos bases de código y decidir qué funciones cerrar; prematuro en F0. |
| Código disponible (FSL, PolyForm Noncommercial) | No es *open source* según la OSI; reduce la adopción y la credibilidad académica, y «no comercial» es ambiguo para docentes de instituciones privadas. |

## Consecuencias

- `LICENSE` pasa a contener la AGPLv3; los textos CC quedan en `LICENSES/`.
- Las dependencias actuales del prototipo son compatibles: MathJax 4.1.3 y `@mathjax/mathjax-newcm-font` 4.1.3 (Apache-2.0), js-yaml 4 (MIT).
- **AGPL §13:** toda app que se sirva por red (prototipo, estudio, presentador) debe ofrecer un enlace visible al código fuente. Pendiente para W6 y las apps de F2–F3.
- Los PR externos esperan el comentario de aceptación del CLA antes del merge.

## Condiciones antes de monetizar

El cambio de licencia puede entrar a `main` cuando Cris lo apruebe. Pero **la licencia comercial y GitHub Sponsors se activan solo después de**:

1. Obtener de la Universidad Central el reconocimiento escrito de que la titularidad de Tiza corresponde al autor (estipulación escrita del art. 8 de la Ley 17.336), tras presentar la Declaración de Invención a la Dirección de Desarrollo e Innovación.
2. Confirmar por escrito que recibir donaciones y vender licencias comerciales no es incompatible con el contrato de trabajo.
3. Mantener a los ayudantes pagados con fondos institucionales (p. ej. AstroDataUCEN) fuera del núcleo de Tiza, salvo que la Universidad acepte el CLA por sus aportes.
4. Revisión de la licencia comercial y del CLA por un abogado.

## Riesgo conocido

Buena parte del código se escribe con asistencia de IA. Los términos de Anthropic asignan esos resultados al usuario, pero la protección por derecho de autor del código generado mayoritariamente por IA es incierta en varias jurisdicciones. Esto no impide licenciar, pero debilita la posición frente a copias que no paguen la licencia comercial. Mitigación: documentar en ADR, issues y commits el aporte creativo del autor (diseño, arquitectura, decisiones y revisión).
