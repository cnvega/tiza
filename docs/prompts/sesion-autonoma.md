# Prompt: sesión autónoma de desarrollo

El coordinador crea una tarea programada con este texto, reemplazando `{N}` por el número del issue. También sirve para lanzar una sesión a mano: pega el texto en una sesión nueva de Claude Code con acceso a GitHub.

---

Eres una sesión autónoma de desarrollo de Tiza, en el repositorio `cnvega/tiza`. Nadie te supervisa en vivo: Cris revisa tu PR después. Tu tarea es el issue #{N}.

1. **Prepara el repositorio.** Agrega `cnvega/tiza` a la sesión con acceso de escritura (`push`) y clónalo.
2. **Lee antes de tocar nada:** `CLAUDE.md`, `docs/coordinacion.md`, `docs/estado.md` y el issue #{N} completo, con sus comentarios. Usa la API REST de GitHub (`gh api repos/cnvega/tiza/...`); GraphQL no está disponible.
3. **Comprueba las dependencias** de la línea «Depende de:» del issue. Si alguna sigue abierta, comenta en el issue que no se puede empezar, deja la etiqueta `estado: bloqueado` y termina en el paso 11.
4. **Marca el issue:** etiqueta `estado: en curso` (quita `estado: listo`) y comenta «En curso — sesión autónoma, AAAA-MM-DD».
5. **Rama** `w<n>/<slug-corto>` desde `main`. Trabaja solo dentro del alcance del issue y de su frente. Respeta D12: ninguna dependencia fuera de MIT, BSD, ISC, Apache-2.0 o MPL-2.0.
6. **Prueba** contra el criterio de aceptación. Si el cambio es visual, saca capturas con Playwright (Chromium ya está instalado), guárdalas en la rama en `docs/capturas/{N}/` y enlázalas en el PR.
7. **PR a `main`.** La primera línea del cuerpo es `Closes #{N}` (en inglés: GitHub solo cierra issues con palabras clave en inglés). Luego: qué cambió, cómo se probó, capturas y lo que quedó pendiente.
8. **Actualiza el issue:** etiqueta `estado: en revisión` (quita `estado: en curso`) y comenta un resumen de tres a cinco líneas con el enlace al PR.
9. **Nunca** hagas merge ni push a `main`, ni cambies un contrato (C1–C6) fuera de un PR con etiqueta `contrato` y su ADR.
10. **Si te bloquea una decisión** que los documentos no resuelven: etiqueta `requiere Cris` y `estado: bloqueado`, comenta la pregunta concreta con dos o tres opciones y tu recomendación, sube lo que tengas en la rama y termina en el paso 11.
11. **Despierta al coordinador:** busca entre las tareas programadas la llamada «Tiza · coordinador» y ejecútala ahora, para que lance la siguiente tarea.
