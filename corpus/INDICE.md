# Índice del corpus

Una fila por guion: archivo, objetivo, qué cubre y resultado esperado del validador (bloque `prueba` del encabezado). Licencia: CC BY-SA 4.0 (ADR 0001).

`esperado` sigue la sección 7 de la especificación: los verbos marcados v1.0 (`sustituir`, `expandir`, `factorizar`, `simplificar`, `ambos-lados`, `recuadro`, `contraer`, `bajar`…) dan W02 en el MVP.

| Archivo | Objetivo | Cubre | Esperado |
| --- | --- | --- | --- |
| [`algebra/01-despeje-lineal.tiza`](algebra/01-despeje-lineal.tiza) | pasar con suma y con producto en modo en el lugar | pasar, suma, producto, en-lugar, recuadro | `ok` |
| [`astrofisica/01-kepler-tercera-ley.tiza`](astrofisica/01-kepler-tercera-ley.tiza) | cancelar con \id, pasar desde un denominador y unión de potencias | cancelar, pasar, fraccion, potencia, id, recuadro | `advertencia:W02` |
| [`bordes/02-left-sin-right.tiza`](bordes/02-left-sin-right.tiza) | un \left sin su \right en la fórmula debe dar E13 | delimitadores-ajustados, validacion | `error:E13` |
| [`bordes/03-paquete-physics.tiza`](bordes/03-paquete-physics.tiza) | activar el paquete physics debe dar W08 y componer \dv y \qty | physics, dv, qty, pasar, parentesis-desaparecen | `advertencia:W08` |
| [`bordes/04-contraer-en-mvp.tiza`](bordes/04-contraer-en-mvp.tiza) | contraer es un gesto de la v1.0; en el MVP debe dar W02 y usar la transición automática | contraer, tensor, delta, renombrar, indices-con-posicion | `advertencia:W02` |
| [`bordes/05-indices-simetricos.tiza`](bordes/05-indices-simetricos.tiza) | índices μν y νμ en el mismo paso; intercambiar índices con referencias de posición y aparición | intercambiar, indices-con-posicion, referencia-n, emparejamiento-indices | `ok` |
| [`cuantica/01-conmutador-posicion-momento.tiza`](cuantica/01-conmutador-posicion-momento.tiza) | conmutador [x̂, p̂] aplicado a una función de prueba, con sustitución, regla del producto, cancelación e intercambio de operadores | comm, sustituir, cancelar, id, parentesis-ajustados, intercambiar, recuadro | `advertencia:W02` |
| [`cuantica/02-anticonmutador-pauli.tiza`](cuantica/02-anticonmutador-pauli.tiza) | anticonmutador con llaves ajustadas que desaparecen y productos de matrices sustituidos | acomm, llaves-ajustadas, sustituir, cancelar, id, en-lugar | `advertencia:W02` |
| [`cuantica/03-valor-esperado-braket.tiza`](cuantica/03-valor-esperado-braket.tiza) | valor esperado con bra-ket, inserción de la identidad y autovalores | expval, braket, middle, suma, abs, resaltar, recuadro | `advertencia:W02` |
| [`cuantica/04-pozo-infinito.tiza`](cuantica/04-pozo-infinito.tiza) | ecuación de Schrödinger independiente del tiempo, solución general y condiciones de borde | pasar, sustituir, borrar, ambos-lados, fraccion, derivada-leibniz, recuadro | `advertencia:W02` |
| [`fisica/01-caida-desde-reposo.tiza`](fisica/01-caida-desde-reposo.tiza) | cancelar con \id, pasar con #n y aparición de una raíz | cancelar, pasar, referencia-n, resaltar, raiz, recuadro | `ok` |
| [`relatividad/01-energia-momento.tiza`](relatividad/01-energia-momento.tiza) | bajar un índice con la métrica, separar la parte temporal y despejar E² | bajar, sustituir, pasar, referencia-n, abs, vec, parentesis-aparecen, expandir | `advertencia:W02` |
| [`relatividad/02-derivada-covariante.tiza`](relatividad/02-derivada-covariante.tiza) | índices escalonados con \tensor y renombre de índices mudos en toda la línea y en un solo término | tensor, indices-escalonados, renombrar, id | `ok` |
| [`relatividad/03-bajar-indice-minkowski.tiza`](relatividad/03-bajar-indice-minkowski.tiza) | bajar un índice con la métrica de Minkowski y escribir la suma en componentes | bajar, sustituir, simplificar, parentesis, indices | `advertencia:W02` |
| [`relatividad/04-dilatacion-tiempo.tiza`](relatividad/04-dilatacion-tiempo.tiza) | tiempo propio desde el intervalo, con factorización, raíz y factor de Lorentz | sustituir, factorizar, ambos-lados, simplificar, raiz, fracciones-anidadas, recuadro | `advertencia:W02` |

## Notas

- En `cuantica/04-pozo-infinito.tiza`, los pasos «Solución general» y los dos bordes no son reescrituras equivalentes: resuelven la ecuación y aplican condiciones de borde. El verificador CAS los marcará distinto de `verificado`, como corresponde.
- `bordes/01-paso-no-equivalente.tiza` llega con el PR del verificador (#22, issue #8); por eso los casos borde de este índice empiezan en `02`.
