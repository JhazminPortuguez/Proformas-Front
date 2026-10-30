# Resumen de la noche (29–30/10/2026)

Rama: `jhazmin` en los dos repos. No toqué `main` ni `Frank`, no hice merge, no borré datos ni ejecuté `migrate:fresh`.

## Qué hice

### 1. Cuenta por cobrar (back) — commit `c448e16`
- Confirmé que los ítems de una orden no se pueden modificar: la API de órdenes solo tiene `index`, `show` y `store`; los ítems se copian de la proforma una vez al crear la orden, y después solo cambia lo consumido. La proforma aceptada tampoco se puede editar ni borrar.
- Al cerrar una orden, la cuenta por cobrar ahora usa el **total de la proforma** (subtotal − descuento + impuesto) y **su moneda**. Antes sumaba las líneas y la dejaba siempre en Bs.
- El resumen `cuenta` que viene con la orden ahora incluye `moneda`.
- Pruebas PHPUnit nuevas: con descuento (Bs 300), con impuesto (Bs 395,50) y en USD (USD 339).
- La demo cambió: la cuenta de la orden cerrada pasa de Bs 530 a **Bs 587,60** ((530 − 10) × 1,13) y su pago parcial de Bs 265 a Bs 293,80. Se actualizó la prueba del seeder.

### 2. Pantalla 4 · Detalle de la orden (front) — commit `b7826c6`
- Botón **"Cerrar orden (genera la cuenta por cobrar)"** con la confirmación *"¿Cerrar la orden y generar la cuenta por cobrar por Bs X?"*, donde X es el total de la proforma en su moneda. Si la orden no trae la proforma, no muestra monto.
- Indicador **"Cerrada el dd/mm/aaaa"** junto al chip de estado, en lugar del recuadro verde.
- **NIT/CI** del cliente en "Datos generales".
- El total de la proforma se muestra con su moneda real.
- **Barra de acciones fija abajo en el celular**; desde `sm` vuelve a la cabecera. Solo aparece si hay acciones.
- **Materiales**: Ítem, Unidad, Cantidad prevista, Cantidad consumida, Fecha de consumo y Stock actual. Quité el chip de estado, el costo promedio y "Pendiente".
- Las pestañas (Resumen, Ítems, Materiales, Historial) se mantienen (D1).

### 3. Pantalla 5 · Listado de órdenes (front) — commit `a6b2ec6`
- **Pestañas de estado**: Todas, Pendientes, Asignadas, En proceso, Finalizadas y Canceladas. Reemplazan el selector "Estado". Conservan la vista (tabla o tablero) y los demás filtros.
- **Columnas**: Código, Cliente (con NIT/CI), Proforma, Operario, Fecha programada, Estado y Acciones. Quité "Ítems"; "Servicio principal" queda fuera (D3).
- En el celular, las tarjetas muestran el NIT/CI y ya no muestran Ítems.
- Se mantienen los atajos en cada fila (D4), las canceladas en una sección aparte del tablero (D5) y el filtro por cliente (D6).
- "Limpiar filtros" del formulario ya no cambia la pestaña de estado.

## Commits (todos en `jhazmin`, subidos a GitHub)

| Repo | Commit | Mensaje |
|---|---|---|
| Back | `c448e16` | fix(cobros): la cuenta por cobrar usa el total y la moneda de la proforma |
| Front | `b7826c6` | feat(ordenes): detalle con monto de cierre, NIT/CI, fecha de cierre, materiales del diseño y acciones fijas en el celular |
| Front | `a6b2ec6` | feat(ordenes): listado con pestañas de estado, NIT/CI del cliente y columnas del diseño |
| Back | `77ef709` | fix(proformas): solo se aceptan proformas en bolivianos (BOB) *(30/10, después de tu revisión)* |
| Front | `7ed4604` | feat(ordenes): tablero con NIT/CI y sin ítems; limpiar filtros conserva la pestaña *(30/10, después de tu revisión)* |

Este archivo va en un commit aparte (`docs:`), para que puedas borrarlo antes de juntar con `main` si no lo quieres en el repo.

## Resultado de las pruebas

- **Back** (después de `c448e16`): 186 aprobadas, 7 omitidas (solo corren con PostgreSQL), 0 fallidas. Pint pasa. El back no se tocó en la pantalla 5.
- **Front** (después de `a6b2ec6`): 230 de 230 aprobadas en 36 archivos. `npm run typecheck` y `npm run lint` pasan sin errores.

## Decisiones pendientes (no las inventé; quedan para ti)

1. **Pantalla de Cobros sin moneda.** ✅ Resuelto: el sistema queda solo en bolivianos. El back rechaza proformas en otra moneda (commit `77ef709`); `formatMoney` sigue sabiendo mostrar otras monedas.
2. **Totales que mezclan monedas.** ✅ Resuelto: con todo en bolivianos ya no hay monedas que mezclar (commit `77ef709`).
3. **Base de datos local.** La cuenta demo sigue en Bs 530 porque se creó antes del arreglo. Solo cambia si vuelves a cargar la demo (`migrate:fresh --seed`, que **borra los datos**). No lo hice.
4. **Contadores en las pestañas de órdenes.** ✅ Resuelto: las pestañas quedan sin contadores.
5. **Tarjetas del tablero.** ✅ Resuelto: ahora son iguales a la tabla, con el NIT/CI y sin Ítems (commit `7ed4604`).
6. **"Limpiar filtros" en el listado vacío.** ✅ Resuelto: también conserva la pestaña y la vista. Si la pestaña está vacía sin filtros, aparece "Sin órdenes en este estado" sin el botón (commit `7ed4604`).
7. **Enlace "Crear desde una proforma aceptada"** en la cabecera del listado. No es un botón "Nueva orden" (solo lleva a las proformas aceptadas), así que lo dejé. ¿Se queda?
8. **Fecha de consumo parcial.** El back solo guarda `consumido_at` cuando la línea se consumió completa. Con consumo parcial la columna muestra "—" (la cantidad consumida sí muestra el avance). ¿Está bien así?
9. **Encabezado "Acciones".** El diseño dice "Acción", pero como decidiste mantener varios atajos por fila (D4), lo dejé en plural.
10. **Juntar con `main`.** Las pantallas 2, 4 y 5, el arreglo de fechas y el de cobros siguen solo en `jhazmin`. El merge queda para cuando cierres la iteración.

## Cómo probar a mano

### Levantar el sistema
1. Ejecuta `C:\VSC\Levantar Proformas.bat`, o levanta el back (`php artisan serve` en `Proformas-Back`) y el front (`npm run dev` en `Proformas-Front`).
2. Abre http://localhost:3000.
3. Usuarios de la demo (contraseña `password`):
   - Admin: `pepitotilcayo@example.com`
   - Operario: `operario@example.com`

### Pantalla 4 · Detalle de la orden
1. Entra como admin a **Órdenes** y abre una orden **Finalizada sin cerrar**. Si no hay ninguna, toma una En proceso y finalízala desde el detalle.
2. **NIT/CI:** en "Datos generales", debajo del nombre del cliente, aparece "NIT/CI …" (solo si el cliente tiene NIT/CI cargado).
3. **Botón de cierre:** dice "Cerrar orden (genera la cuenta por cobrar)". Al pulsarlo, el mensaje dice "¿Cerrar la orden y generar la cuenta por cobrar por Bs X?". X debe ser igual al total de la proforma, con descuento e impuesto.
4. Confirma el cierre:
   - Junto al chip de estado aparece "Cerrada el dd/mm/aaaa" con la fecha de hoy en Bolivia.
   - Ya no aparece el recuadro verde.
   - Con "Ver cobro" se abre la cuenta: su monto es el total de la proforma.
5. **Barra del celular:** abre una orden con acciones (por ejemplo, una Pendiente o Asignada) y achica la ventana a ancho de celular (o usa las herramientas de desarrollador, F12 → modo dispositivo):
   - Las acciones quedan fijas abajo.
   - Al bajar hasta el final, la barra no tapa el contenido.
   - En una orden cerrada o cancelada, sin acciones, no aparece la barra.
6. **Materiales:** en la pestaña Materiales de una orden con materiales, revisa las columnas Ítem, Unidad, Cantidad prevista, Cantidad consumida, Fecha de consumo y Stock actual, sin chip ni costo.
7. **Operario:** entra como operario. Solo debe ver sus órdenes, y en sus órdenes no debe aparecer el botón de cierre.

### Pantalla 5 · Listado de órdenes
1. En **Órdenes**, sobre la tabla, aparecen las pestañas Todas, Pendientes, Asignadas, En proceso, Finalizadas y Canceladas.
   - Cada pestaña filtra por su estado y queda marcada.
   - Ya no hay selector "Estado" en los filtros.
2. **Columnas:** Código, Cliente (con NIT/CI debajo si existe), Proforma, Operario, Fecha programada, Estado y Acciones. No hay columna "Ítems".
3. **Filtros:** elige un cliente o escribe una búsqueda y cambia de pestaña. El filtro debe mantenerse.
   - Pulsa "Limpiar filtros" en el formulario: se borran los filtros pero sigues en la misma pestaña.
4. **Tablero:** cambia a "Tablero" y cambia de pestaña.
   - La vista debe seguir en tablero.
   - En "Todas", las canceladas aparecen en la sección aparte, debajo.
5. **Celular:** en ancho de celular, las tarjetas muestran el NIT/CI y no muestran "Ítems".
6. **Atajos:** en una fila con estado Asignada, el atajo "Iniciar" pide confirmación. En una Finalizada, "Cerrar" muestra el mensaje con el monto.
7. **Operario:** como operario, la pantalla no muestra el filtro "Operario" y solo lista sus órdenes.
8. **NIT/CI en el tablero:** cambia a "Tablero".
   - En cada tarjeta, debajo del nombre del cliente, aparece "NIT/CI …" (solo si el cliente lo tiene cargado).
   - Las tarjetas muestran Proforma, Operario y Programada, sin "Ítems".
9. **"Limpiar filtros" del listado vacío:** entra a una pestaña, por ejemplo "Finalizadas", y elige un cliente o escribe una búsqueda que no tenga resultados.
   - Aparece "Sin coincidencias" con el botón "Limpiar filtros".
   - Al pulsarlo, se borran los filtros pero sigues en la misma pestaña y en la misma vista (tabla o tablero).
   - Si una pestaña está vacía sin filtros, aparece "Sin órdenes en este estado" y no aparece el botón.
