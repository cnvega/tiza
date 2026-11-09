# Pares de prueba del modo evaluación

Treinta transiciones para el criterio de salida de F0: **80 % de aciertos** en el emparejamiento (issue #12). Cada par es el paso de `a − 1` a `a` de un guion del corpus o de un ejemplo de la especificación. En el prototipo se cargan desde el selector **Par** del panel de evaluación.

Archivo generado por `generar-pares.mjs`; para cambiar la lista, edita `PARES` en ese archivo y vuelve a correrlo.

| Par | Guion | Transición | Qué pone a prueba |
| --- | --- | --- | --- |
| 01 | [`algebra/01-despeje-lineal`](../../../corpus/algebra/01-despeje-lineal.tiza) — Despeje lineal | 1 → 2: Ecuación inicial → El 5 pasa restando | Despeje lineal: pasar con suma, en el lugar |
| 02 | [`algebra/01-despeje-lineal`](../../../corpus/algebra/01-despeje-lineal.tiza) — Despeje lineal | 3 → 4: Restamos → El 3 pasa dividiendo | Despeje lineal: pasar con producto (factor a divisor), en el lugar |
| 03 | especificación 10.1 — Despeje lineal | 1 → 2: Ecuación inicial → El 5 pasa restando | Despeje lineal: pasar con suma, en líneas nuevas |
| 04 | especificación 10.1 — Despeje lineal | 2 → 3: El 5 pasa restando → (sin título) | Reordenar y simplificar sin acciones (paso sin título) |
| 05 | [`astrofisica/01-kepler-tercera-ley`](../../../corpus/astrofisica/01-kepler-tercera-ley.tiza) — Tercera ley de Kepler para una órbita circular | 1 → 2: Igualamos fuerzas → La masa del satélite se cancela | Cancelación de un factor común con \id |
| 06 | [`astrofisica/01-kepler-tercera-ley`](../../../corpus/astrofisica/01-kepler-tercera-ley.tiza) — Tercera ley de Kepler para una órbita circular | 3 → 4: Multiplicamos por r → Escribimos la velocidad con el período | Paréntesis que aparecen (\left…\right) y fracciones anidadas |
| 07 | [`astrofisica/01-kepler-tercera-ley`](../../../corpus/astrofisica/01-kepler-tercera-ley.tiza) — Tercera ley de Kepler para una órbita circular | 5 → 6: Desarrollamos el cuadrado → T² pasa multiplicando | Exponente que cambia de rol: T² de denominador a factor |
| 08 | [`astrofisica/01-kepler-tercera-ley`](../../../corpus/astrofisica/01-kepler-tercera-ley.tiza) — Tercera ley de Kepler para una órbita circular | 6 → 7: T² pasa multiplicando → GM/r pasa dividiendo | Término desde un denominador: fracción GM/r al otro lado |
| 09 | [`astrofisica/01-kepler-tercera-ley`](../../../corpus/astrofisica/01-kepler-tercera-ley.tiza) — Tercera ley de Kepler para una órbita circular | 7 → 8: GM/r pasa dividiendo → Reunimos las potencias de r | Potencias que se reúnen (r² · r → r³), rayas de fracción |
| 10 | [`fisica/01-caida-desde-reposo`](../../../corpus/fisica/01-caida-desde-reposo.tiza) — Velocidad de caída desde el reposo | 1 → 2: Conservación de la energía → La masa se cancela | Cancelación de la masa con \id |
| 11 | [`fisica/01-caida-desde-reposo`](../../../corpus/fisica/01-caida-desde-reposo.tiza) — Velocidad de caída desde el reposo | 2 → 3: La masa se cancela → El 2 pasa multiplicando | Términos repetidos: referencia 2#1 |
| 12 | [`bordes/03-paquete-physics`](../../../corpus/bordes/03-paquete-physics.tiza) — Velocidad con el paquete physics | 1 → 2: Movimiento con aceleración constante → Quitamos el paréntesis | Paréntesis que desaparecen (\qty, paquete physics) |
| 13 | [`bordes/03-paquete-physics`](../../../corpus/bordes/03-paquete-physics.tiza) — Velocidad con el paquete physics | 2 → 3: Quitamos el paréntesis → La velocidad inicial pasa restando | Derivada de Leibniz (\dv) y pasar v₀ |
| 14 | [`bordes/04-contraer-en-mvp`](../../../corpus/bordes/04-contraer-en-mvp.tiza) — Traza de un tensor mixto con la delta de Kronecker | 1 → 2: Contracción con la delta → La delta iguala los índices | Contracción con la delta (W02: transición automática) |
| 15 | [`bordes/04-contraer-en-mvp`](../../../corpus/bordes/04-contraer-en-mvp.tiza) — Traza de un tensor mixto con la delta de Kronecker | 2 → 3: La delta iguala los índices → Renombramos el índice mudo | Renombre de índice mudo μ → α |
| 16 | [`bordes/05-indices-simetricos`](../../../corpus/bordes/05-indices-simetricos.tiza) — Contracción de un tensor simétrico | 1 → 2: Dos órdenes de índices → Usamos la simetría de A | Intercambiar índices con posición y aparición (_\nu#2) |
| 17 | [`bordes/05-indices-simetricos`](../../../corpus/bordes/05-indices-simetricos.tiza) — Contracción de un tensor simétrico | 2 → 3: Usamos la simetría de A → Sumamos los términos iguales | Sumar términos iguales sin acciones (coeficiente 2 aparece) |
| 18 | [`cuantica/01-conmutador-posicion-momento`](../../../corpus/cuantica/01-conmutador-posicion-momento.tiza) — Conmutador de posición y momento | 1 → 2: Definición del conmutador → Posición en su propia representación | Conmutador \comm con sustitución de x̂ |
| 19 | [`cuantica/01-conmutador-posicion-momento`](../../../corpus/cuantica/01-conmutador-posicion-momento.tiza) — Conmutador de posición y momento | 2 → 3: Posición en su propia representación → Momento como derivada | Momento como derivada: d/dx y paréntesis ajustados |
| 20 | [`cuantica/01-conmutador-posicion-momento`](../../../corpus/cuantica/01-conmutador-posicion-momento.tiza) — Conmutador de posición y momento | 5 → 6: Distribuimos → Los términos con la derivada se cancelan | Cancelar dos términos marcados con \id |
| 21 | [`cuantica/01-conmutador-posicion-momento`](../../../corpus/cuantica/01-conmutador-posicion-momento.tiza) — Conmutador de posición y momento | 7 → 8: Vale para toda f → Al revés cambia el signo | Orden de operadores: intercambiar x̂ y p̂ |
| 22 | [`cuantica/02-anticonmutador-pauli`](../../../corpus/cuantica/02-anticonmutador-pauli.tiza) — Anticonmutador de dos matrices de Pauli | 1 → 2: Definición del anticonmutador → Primer producto | Anticonmutador \acomm y llaves ajustadas, en el lugar |
| 23 | [`cuantica/02-anticonmutador-pauli`](../../../corpus/cuantica/02-anticonmutador-pauli.tiza) — Anticonmutador de dos matrices de Pauli | 3 → 4: Segundo producto → Se cancelan | Cancelar en el lugar con \id |
| 24 | [`cuantica/03-valor-esperado-braket`](../../../corpus/cuantica/03-valor-esperado-braket.tiza) — Valor esperado de la energía con la identidad | 1 → 2: Valor esperado → Insertamos la identidad | Valor esperado y Dirac: \expval, \braket con \middle, suma |
| 25 | [`cuantica/04-pozo-infinito`](../../../corpus/cuantica/04-pozo-infinito.tiza) — Energías del pozo de potencial infinito | 1 → 2: Ecuación de Schrödinger dentro del pozo → Multiplicamos por −2m/ħ² | Ambos lados por una fracción con paréntesis; derivada de Leibniz |
| 26 | [`relatividad/01-energia-momento`](../../../corpus/relatividad/01-energia-momento.tiza) — Relación energía-momento desde el cuadrimomento | 1 → 2: Norma del cuadrimomento → Bajamos el índice con la métrica | Bajar un índice con la métrica (W02: transición automática) |
| 27 | [`relatividad/01-energia-momento`](../../../corpus/relatividad/01-energia-momento.tiza) — Relación energía-momento desde el cuadrimomento | 6 → 7: La masa pasa sumando → c² pasa multiplicando | Términos repetidos: pasar c^2#2 |
| 28 | [`relatividad/02-derivada-covariante`](../../../corpus/relatividad/02-derivada-covariante.tiza) — Divergencia covariante de un tensor mixto | 2 → 3: Expandimos la derivada covariante → Renombramos λ en toda la línea | Índices escalonados (\tensor) y renombrar λ en varios términos |
| 29 | [`relatividad/02-derivada-covariante`](../../../corpus/relatividad/02-derivada-covariante.tiza) — Divergencia covariante de un tensor mixto | 3 → 4: Renombramos λ en toda la línea → Renombramos μ solo en el último término | Renombrar μ solo en un término (referencia t3) |
| 30 | [`relatividad/04-dilatacion-tiempo`](../../../corpus/relatividad/04-dilatacion-tiempo.tiza) — Dilatación del tiempo desde el intervalo invariante | 6 → 7: Raíz cuadrada → La raíz pasa dividiendo | Raíz que pasa dividiendo; fracciones anidadas |

## Cobertura

Cubre los casos de la matriz mínima de la especificación (sección 11) que tienen guion en el corpus, incluidas cuántica (conmutador, anticonmutador, Dirac) y relatividad (índices escalonados, bajar, contraer, renombrar). Quedan fuera:

- **Integral definida** y **vectores y unidades** como caso propio: el corpus aún no tiene un guion con integral (W2).
- **Guion con error deliberado** (`bordes/02-left-sin-right.tiza`): no compila, así que no tiene transiciones que evaluar.
- `bordes/01-paso-no-equivalente.tiza`: pone a prueba el verificador, no el emparejamiento.
