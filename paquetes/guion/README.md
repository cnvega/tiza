# @tiza/guion

Analizador y validador de guiones `.tiza` (contrato C1 → C2, frente W1).

Estado: andamiaje (W0). Solo expone `FORMATOS_ADMITIDOS` y `esFormatoAdmitido`, con una prueba, para que el CI tenga algo que correr. El analizador llega con el issue de W1.

```sh
pnpm --filter @tiza/guion test
pnpm --filter @tiza/guion tipos
```
