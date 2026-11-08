# ADR 0002 — Índices tensoriales y delimitadores para cuántica y relatividad

- Estado: propuesto (lo aprueba Cris)
- Fecha: 2026-11-07
- Contrato: C1 (`tiza/0.1` → `tiza/0.2`)
- Issue: #5

## Contexto

La primera versión de Tiza apunta a cursos de física. Dos notaciones aparecen en casi toda derivación de mecánica cuántica y de relatividad, y `tiza/0.1` no las cubría bien:

1. **Índices tensoriales** superiores e inferiores, a veces escalonados (`T^{\mu}{}_{\nu}`, `R^{\rho}{}_{\sigma\mu\nu}`), con convención de suma de Einstein, índices mudos que se renombran y métricas que suben o bajan índices.
2. **Delimitadores de varios tipos:** paréntesis ( ), corchetes [ ] para conmutadores, llaves { } para anticonmutadores, angulares ⟨ ⟩ para valores esperados y notación de Dirac, y barras | | y ‖ ‖ para módulo y norma.

LaTeX y MathJax ya componen todo esto. Lo que faltaba era fijar qué se admite, cómo se escribe de forma cómoda y qué gestos de pizarrón le corresponden.

## Evidencia

Prueba de factibilidad del 2026-11-07 sobre el prototipo F0, con MathJax 4.1.3, el paquete `braket`, cinco macros de delimitadores y la expansión de `\tensor` hecha por Tiza antes de MathJax:

| Derivación | Pasos | Resultado |
| --- | --- | --- |
| Energía-momento desde p_μ p^μ = −m²c² | 5 | Compila; al bajar el índice, el μ inferior de p pasa al μ inferior de la métrica, como corresponde |
| Conmutador [x̂, p̂] f = iħ f | 5 | Compila; los corchetes y paréntesis se emparejan entre pasos; `cancelar` tacha bien |
| Valor esperado ⟨Ĥ⟩ con bra-ket | 4 | Compila; ⟨ ⟩, barras y llaves del anticonmutador correctos |
| Derivada covariante de T^μ_ν y tensor de Riemann | 4 | Índices escalonados correctos; renombrar λ → σ hoy borra y reescribe los cuatro λ |

Ningún paso produjo errores de composición. El emparejamiento automático distingue índices de bases por tamaño y altura.

## Decisión

1. **`tiza/0.2`**, compatible hacia atrás: todo guion `tiza/0.1` válido sigue siendo válido.
2. **Paquetes de TeX:** AMS y `braket` activos siempre. `physics` solo a pedido con la clave `paquetes: [physics]`, porque redefine `\div` (÷), `\dd` y otros comandos de uso común; su uso produce W08.
3. **Macros de delimitadores** propias de Tiza: `\comm{A}{B}` → [A, B], `\acomm{A}{B}` → {A, B}, `\expval{A}` → ⟨A⟩, `\abs{x}` → |x|, `\norm{x}` → ‖x‖. Se ajustan solas al alto del contenido. Coinciden en nombre y significado con las de `physics`, para que un guion se pueda llevar a LaTeX.
4. **`\tensor{base}{índices}`** para índices escalonados, con la sintaxis del paquete `tensor` de LaTeX: `\tensor{T}{^\mu_\nu}` produce T^μ{}_ν. Tiza lo expande antes de componer.
5. **Referencias con posición:** `^\mu` y `_\mu` limitan una referencia a índices superiores o inferiores.
6. **Cinco gestos nuevos, en el MVP:**

   | Gesto | Qué hace en la pizarra |
   | --- | --- |
   | `renombrar A B` | Transforma en el lugar cada A del término indicado (o de toda la línea) en B, sin borrar |
   | `contraer REF REF` | Une con un arco el par de índices repetidos y luego aplica la contracción |
   | `bajar REF` / `subir REF` | El índice baja o sube en arco mientras se escribe la métrica que lo hace |
   | `intercambiar REF REF` | Dos términos o factores cambian de lugar en arcos cruzados (orden de operadores) |

7. **Validaciones nuevas:** E13 (`\left` y `\right` sin pareja), W06 (índices libres distintos en los dos lados de una ecuación), W07 (un índice repetido más de dos veces en un término) y W08 (paquete `physics` activo).

## Consecuencias

- **C3 (glifos), cuando W0 lo defina,** debe incluir la posición de índice de cada glifo (`indice: sup | sub | null`, tomada del árbol MathML) y tratar los delimitadores estirables como piezas que se escalan en alto, no como glifos que viajan.
- **Verificación (C6):** los pasos con índices abstractos quedan `no-verificable` en la v1.0, salvo que se escriban en componentes. Los conmutadores de operadores se pueden verificar con `sympy.physics.quantum` (símbolos no conmutativos). Cadabra, el CAS de referencia para tensores, queda excluido por D12 (licencia GPL).
- **Plazo:** los cinco gestos y las validaciones W06 y W07 agregan alrededor de 1,5 semanas a F1 (núcleo) y F3 (validación en el estudio). El MVP pasaría del 19 de febrero al 2 de marzo de 2027, aún antes del inicio de clases si el semestre parte en marzo. Alternativa: dejar `bajar`, `subir` y `contraer` para la v1.0 y mantener el 19 de febrero.
- **Corpus:** la matriz de cobertura suma casos de cuántica y relatividad.

## Alternativas descartadas

- **`physics` activo por defecto:** cubre bra-ket, conmutadores y derivadas, pero rompe `\div` y otros comandos en guiones de álgebra.
- **Solo índices con `{}` explícitas, sin `\tensor`:** funciona, pero es incómodo de escribir y fácil de equivocar en tensores de cuatro índices.
- **Gestos tensoriales solo en la v1.0:** abarata el MVP, pero la primera versión no serviría para una clase de relatividad.
