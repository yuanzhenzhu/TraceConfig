# Historias de usuario por épica: módulo Configuración

Sacadas del prototipo construido (rama `prueba/estructura-y-unidades`, 2026-11-05). Describen lo que hace hoy el prototipo, no lo que había en los tableros. El histórico de cambios y decisiones está en `backlog-configuracion.md` y `flujos/epica-a-alta-inicial.md`.

- **Rol:** hablamos de *jefe de mantenimiento* como quien configura. *Por confirmar* qué rol tiene permiso de configuración.
- **ID:** se mantienen los del backlog; las historias nuevas empiezan en HU-65. Las que se sustituyen o se descartan están al final.
- **Datos:** los del prototipo son de ejemplo (ficticios) salvo donde se indica.

| Épica | Apartado del menú | Historias |
|---|---|---|
| A. Flotas y configuraciones | Flotas y configuraciones | HU-01, 02, 03, 65, 66, 29 |
| B. Alta de una configuración (asistente) | Asistente, 6 pasos | HU-04, 05, 06, 67, 60, 44, 21, 56, 22–25, 27, 28 |
| C. Configuración activa | Flotas y configuraciones › menú | HU-68, 32 |
| D. Estructura y propiedades de hueco | Estructura y propiedades de hueco | HU-39, 40, 07, 08, 41, 42, 43, 57 |
| E. Drivers | Drivers | HU-59, 13 |
| F. Propiedades de categoría | Propiedades de categoría | HU-55, 15, 16 |
| G. Cambio de número de serie | Cambio de número de serie | HU-63, 64 |
| H. Almacenes | Almacenes | HU-61, 62 |

---

## Épica A. Flotas y configuraciones

### HU-01 · Ver las flotas y sus configuraciones
**Como** jefe de mantenimiento **quiero** ver todas las flotas con sus configuraciones y el estado de cada una **para** saber qué está listo, qué está a medias y por dónde seguir.
- Una fila por flota que se despliega en una fila por configuración. Columnas: Flota, Estructura, Unidades, Estado y Acciones.
- El estado es de cada configuración (*En configuración* o *Activa*). La flota muestra el recuento por estado, o *Sin configurar* si no tiene ninguna.
- Las flotas con algo en configuración salen desplegadas.
- Filtros por flota, estructura y estado, con *Restablecer*. Paginador.
- Estados de pantalla: cargando, vacío (sin flotas), sin resultados y error con *Reintentar*.

### HU-02 · Crear una flota
**Como** jefe de mantenimiento **quiero** dar de alta una flota con sus datos básicos **para** empezar a configurarla.
- Dialog *Nueva flota*: nombre (obligatorio, único) y descripción.
- Pregunta *¿Cuántas estructuras tiene la flota?*: **Una** o **Varias**.
  - **Una:** la configuración se llama como la flota. El botón es *Crear y configurar* y abre el asistente.
  - **Varias:** se indica cuántas (2 a 10) y el nombre de cada configuración. El botón es *Crear* y el flujo termina en el listado, donde cada configuración se inicia por separado.
- La estructura y las unidades no se piden aquí: se indican en el paso 1 de cada configuración.

### HU-03 · Añadir una configuración a una flota
**Como** jefe de mantenimiento **quiero** añadir otra configuración a una flota existente **para** gestionar en la misma flota grupos de trenes con estructuras distintas.
- En el menú de 3 puntos de la flota: *Añadir configuración*. Si la flota no tiene ninguna, *Iniciar configuración* abre el mismo dialog de la HU-02 sin pedir el nombre de la flota.
- Las configuraciones sin estructura aparecen como *Sin iniciar* con el botón *Iniciar configuración*; las que están a medias, con *Continuar*. Los dos botones son tonales.

### HU-65 · Modificar el nombre y la descripción
**Como** jefe de mantenimiento **quiero** cambiar el nombre y la descripción de una flota o de una configuración **para** mantenerlos al día.
- Opción *Modificar nombre y descripción* en el menú de 3 puntos de la flota y de cada configuración.
- El nombre es obligatorio y no se puede repetir dentro de su ámbito. *Guardar* solo se activa si hay cambios.
- Si la flota tiene una sola estructura, el nombre de su configuración no se edita: se cambia el de la flota y la configuración lo sigue.

### HU-66 · Ver la descripción sin ocupar una columna
**Como** jefe de mantenimiento **quiero** ver la descripción de una flota o una configuración solo cuando la necesito **para** que la tabla sea más limpia.
- Icono *info* junto al nombre con un tooltip que muestra la descripción, o *Sin descripción*. Accesible con el teclado.

### HU-29 · Eliminar una configuración que no está activa
**Como** jefe de mantenimiento **quiero** eliminar una configuración sin configurar o en configuración **para** quitar las que ya no se necesitan.
- Opción *Eliminar* en el menú de la configuración, solo si no está activa. Pide confirmación.
- La estructura no se borra: sigue en el catálogo.

---

## Épica B. Alta de una configuración (asistente)
Seis pasos: 1 Estructura y unidades · 2 Valores de propiedades de hueco · 3 Drivers · 4 Propiedades de categoría · 5 Carga de datos · 6 Resumen y finalizar. Pie con *Guardar y salir*, *Anterior* y *Siguiente*. No hay *Omitir paso*: en los pasos opcionales basta con pulsar *Siguiente*.

### HU-04 · Indicar el número de unidades
**Como** jefe de mantenimiento **quiero** indicar cuántas unidades tiene la configuración **para** generar las unidades que comparten la estructura.
- Paso 1. Número entero entre 1 y 999, obligatorio. Los nº de serie llegan después, en la plantilla de unidades.
- Se ve el total de huecos: unidades × huecos por unidad.

### HU-05 · Elegir una estructura existente
**Como** jefe de mantenimiento **quiero** elegir una estructura del catálogo y verla antes de usarla **para** comprobar que es la correcta.
- Paso 1, pestaña *Usar una estructura existente*: lista de estructuras con huecos por unidad y nº de configuraciones que la usan.
- Vista previa en dos pestañas de consulta: *Estructura* (árbol) y *Propiedades de hueco* (lista de propiedad, hueco y posición). Las propiedades vienen seleccionadas con la estructura y aquí no se cambian.
- Se puede cambiar de estructura todas las veces que se quiera hasta confirmarla (HU-67).

### HU-06 · Crear una estructura nueva desde el asistente
**Como** jefe de mantenimiento **quiero** crear una estructura nueva si ninguna me sirve **para** no tener que salir y perder lo hecho.
- Paso 1, pestaña *Crear una estructura nueva*: un aviso explica el proceso y el botón *Ir a Estructuras* lleva al editor de estructura nueva.
- En el editor, un aviso indica para qué configuración se crea. *Crear y volver al asistente* la añade al catálogo y la asigna; *Cancelar y volver al asistente* vuelve sin estructura.
- Al volver, la estructura queda fijada: ya no se puede elegir una existente. Se conserva lo rellenado en el paso 1.

### HU-67 · Confirmar la estructura
**Como** jefe de mantenimiento **quiero** que se me avise de que la estructura no se podrá cambiar **para** no equivocarme, porque todo lo demás depende de ella.
- Al pulsar *Siguiente* en el paso 1 por primera vez: dialog *¿Usar Estructura X en esta configuración?* con *Revisar estructura* y *Confirmar y continuar*.
- Una vez confirmada, no se puede cambiar. Si hace falta otra, hay que crear de nuevo la configuración.
- Hasta confirmarla, los demás pasos no se pueden abrir desde la barra de pasos. La configuración se guarda como *En configuración* al completar el paso 1.

### HU-60 · Dar valor a las propiedades de hueco (opcional)
**Como** jefe de mantenimiento **quiero** dar valor a las propiedades de hueco que trae la estructura **para** describir cada posición en esta configuración.
- Paso 2. Lista con una fila por propiedad y hueco: propiedad, hueco, posición (*Tren › Coche 1*) y un campo de valor.
- Los valores son propios de cada configuración y se pueden dejar vacíos. Búsqueda por posición y filtros por propiedad y categoría. Recuento *N de M con valor*.
- Si la estructura no tiene propiedades de hueco, se muestra un estado vacío y se puede continuar.

### HU-44 · Marcar los drivers de la configuración
**Como** jefe de mantenimiento **quiero** marcar con qué drivers cuenta su vida cada activo **para** que el mantenimiento se calcule con el dato correcto.
- Paso 3. Los drivers son propios de cada configuración (flota + estructura): dos flotas con la misma estructura pueden tener drivers distintos.
- Se marcan sobre la estructura entera de la unidad, hueco a hueco, con *Tiene* y *Heredable* para kilometraje, ciclos y horas.
- Por defecto, todos los huecos tienen kilometraje y lo heredan, salvo la unidad (HU-10). Al marcar un driver en un hueco, los que cuelgan de él también lo tienen y lo heredan (HU-11, HU-12). *Restablecer por defecto*.
- Un hueco solo puede heredar un driver si su padre lo tiene.

### HU-21 · Indicar el cálculo de los drivers en SMS (opcional)
**Como** jefe de mantenimiento **quiero** indicar qué drivers se envían a SMS y cómo se calculan **para** que la planificación de mantenimientos use los datos correctos.
- Paso 3, dentro de la sección Drivers. Solo si la flota usa SMS (en el prototipo, todas). Es propio de cada configuración.
- Cada cálculo tiene dos pasos: **1. Driver** (kilometraje, ciclos u horas) y **2. Forma de cálculo** (Flota, Línea, Categoría, o Categoría y posición).
- *Añadir otro driver* añade otro cálculo, uno por driver. Un cálculo a medias no deja continuar.

### HU-56 · Asignar las propiedades de categoría (opcional)
**Como** jefe de mantenimiento **quiero** ver y asignar las propiedades de las categorías de mi estructura sin salir del asistente **para** completar la configuración de una vez.
- Paso 4. Mismo editor que en *Propiedades de categoría* (HU-55), limitado a las categorías de la estructura.
- Aviso de que son comunes a todo el cliente y que un cambio afecta a todas las flotas.

### HU-22 · Descargar las plantillas de carga
**Como** jefe de mantenimiento **quiero** descargar una plantilla por categoría **para** rellenar los datos de los activos.
- Paso 5. La plantilla incluye una fila por unidad y hueco, una columna por driver propio (no heredado) y una por propiedad de categoría asignada.
- Los niveles se habilitan en orden: antes hay que cargar el nivel anterior.

### HU-23 · Subir las plantillas poco a poco
**Como** jefe de mantenimiento **quiero** subir las plantillas cuando las tenga **para** no tener que cargarlo todo de una vez.
- Arrastrar o seleccionar un archivo (.xlsx o .csv), validar y cargar. Una plantilla cargada se puede reemplazar.
- La plantilla de unidades (primer nivel) es obligatoria para finalizar; el resto se puede cargar después.

### HU-24 · Ver los errores de una plantilla
**Como** jefe de mantenimiento **quiero** ver por qué falla una plantilla **para** corregirla.
- Si tiene errores, no se carga ningún dato. Dialog con fila, columna y error, y botón *Subir de nuevo*.

### HU-25 · Ver qué plantillas están cargadas
**Como** jefe de mantenimiento **quiero** ver el estado de cada plantilla **para** saber qué me falta.
- Tabla por nivel y categoría: huecos por unidad, registros y estado (*Pendiente*, *Cargada*, *Con errores*). Recuento de plantillas cargadas y unidades terminadas.

### HU-27 · Salir y retomar una configuración
**Como** jefe de mantenimiento **quiero** salir del asistente y volver más tarde **para** no perder lo hecho.
- *Guardar y salir* en cualquier paso. *Continuar* en el listado vuelve al paso en el que se quedó.
- Si se sale antes de completar el paso 1, se avisa de que no se guardará nada.
- Accesos directos a las otras configuraciones de la misma flota que están a medias.

### HU-28 · Revisar el resumen y finalizar
**Como** jefe de mantenimiento **quiero** revisar un resumen y finalizar **para** que las unidades queden activas.
- Paso 6. Una card por paso con lo esencial y el botón *Editar*:
  - Estructura y unidades: nombre y descripción de la configuración y de la estructura, unidades, con o sin propiedades de hueco.
  - Valores de propiedades de hueco: *N de M huecos con valores*, o *No hay propiedades de hueco en esta configuración*.
  - Drivers: *Tiene kilometraje y ciclos*, y si tiene cálculo en SMS.
  - Propiedades de categoría: *Comunes a todas las flotas*, *N categorías con propiedades*.
  - Carga de datos: *N de M plantillas cargadas*.
- *Finalizar configuración* solo se activa con la plantilla de unidades cargada. La configuración pasa a *Activa*.

---

## Épica C. Configuración activa

### HU-68 · Consultar una configuración activa
**Como** jefe de mantenimiento **quiero** ver cómo está configurada una configuración activa sin riesgo de cambiar nada **para** revisarla o explicarla.
- Opción *Consultar* en el menú de la configuración activa. Abre el asistente entero, desde el paso 1, en solo lectura.
- Todos los pasos se abren desde la barra de pasos. Aviso *Estás consultando una configuración activa*. Pie con *Volver al listado*, *Anterior* y *Siguiente*.
- Campos y casillas bloqueados. Las plantillas se pueden descargar, pero no subir. No hay *Finalizar*.

### HU-32 · Añadir unidades a una configuración activa
**Como** jefe de mantenimiento **quiero** añadir unidades a una configuración activa **para** dar de alta trenes nuevos de la misma serie.
- Opción *Añadir unidad* en el menú de la configuración activa. Abre el asistente con todo en solo lectura menos:
  - Paso 1: el nº de unidades, que tiene que ser mayor que el actual.
  - Paso 5: la carga de datos. La plantilla de unidades vuelve a quedar pendiente y es obligatoria; el resto se puede subir si ya se tienen los datos.
- En Carga de datos, la columna Registros muestra los actuales más los nuevos (*16 + 2*), en rojo si la plantilla es obligatoria y en ámbar si es opcional.
- Los cambios son un borrador: solo se guardan al pulsar *Añadir N unidades* en el resumen. Si se sale antes (*Cancelar*, con aviso, o cerrando la página), no cambia nada.

---

## Épica D. Estructura y propiedades de hueco
La estructura es común a todo el cliente: modificarla afecta a todas las configuraciones que la usan. Sin versiones ni variantes.

### HU-39 · Ver el catálogo de estructuras
**Como** jefe de mantenimiento **quiero** ver las estructuras del cliente y dónde se usan **para** reutilizarlas y conocer el impacto de un cambio.
- Columnas: Estructura (con icono *info* para la descripción), Propiedad de hueco (*Sí* / *No*), Configuraciones, Unidades, Estado (*En uso* / *Sin usar*) y Acciones.
- Cada estructura en uso se despliega con las configuraciones que la usan y su estado. Búsqueda por nombre.
- Menú de 3 puntos: *Modificar* y *Eliminar*.

### HU-40 · Crear una estructura
**Como** jefe de mantenimiento **quiero** crear una estructura desde cero o copiando otra **para** reutilizar lo ya definido.
- Nombre obligatorio y único, y descripción. Punto de partida: *Desde cero* o *Copiar una estructura existente*. Al copiar se copia el árbol, no las propiedades de hueco.

### HU-07 · Montar la estructura
**Como** jefe de mantenimiento **quiero** montar el árbol arrastrando categorías, copiando, pegando y eliminando **para** construirlo rápido.
- Editor en la pestaña *Estructura*. Los nombres se numeran solos (Coche 1, Coche 2…). Una estructura vacía no se puede guardar.

### HU-08 · Elegir categorías de una lista
**Como** jefe de mantenimiento **quiero** una lista de las categorías del cliente **para** añadir elementos sin escribirlos.
- 30 categorías: las de las estructuras de ejemplo y las de la lista del cliente (ACR Box, Breaker, Cabin HVAC, Gearbox, SIV…). Con buscador.

### HU-41 · Modificar una estructura en uso
**Como** jefe de mantenimiento **quiero** modificar una estructura que ya se usa viendo antes a quién afecta **para** no romper nada sin saberlo.
- Aviso con las configuraciones y unidades que la usan. Una estructura en uso solo se modifica por los extremos (añadir o quitar hojas).
- Al guardar, dialog *¿Aplicar los cambios en N configuraciones?* con los huecos añadidos y eliminados y las unidades que quedarán incompletas.
- Los huecos nuevos heredan los drivers de su padre en cada configuración.

### HU-42 · Ver las unidades incompletas tras un cambio
**Como** jefe de mantenimiento **quiero** ver qué unidades han quedado incompletas por un cambio de estructura **para** cargar los datos que faltan.
- En el listado de flotas y en el de estructuras: etiqueta *N unidades incompletas* en las configuraciones activas afectadas.

### HU-43 · Eliminar una estructura sin usar
**Como** jefe de mantenimiento **quiero** eliminar una estructura que no usa nadie **para** mantener el catálogo limpio.
- *Eliminar* en el menú, desactivado si la estructura está en uso. Pide confirmación.

### HU-57 · Asignar las propiedades de hueco de una estructura
**Como** jefe de mantenimiento **quiero** elegir qué propiedades tiene cada posición de la estructura **para** que todas las flotas que la usen describan sus huecos igual.
- Pestaña *Propiedades de hueco (N)* del editor de estructura. Matriz como la de drivers: la estructura en filas y una columna por propiedad. Se marca directamente, sin seleccionar antes los huecos. *Validada por el equipo.*
- Atajo *Asignar a todos* / *Quitar a todos* por propiedad y categoría. *Ver solo huecos con propiedades*.
- Propiedades del cliente (códigos reales): LOCATION, VISIBILITY, CAF-CODE, AUX_POSITION, LABEL, VAR_KMS, VAR_CYC, VAR_HRS, CT_GMAO, KNUCKLE. Sus tipos y ejemplos son ficticios.
- Aquí solo se elige qué propiedades hay; los valores se dan en cada configuración (HU-60). Si la estructura está en uso, pide confirmación al guardar.

---

## Épica E. Drivers

### HU-59 · Ver los drivers de cada configuración
**Como** jefe de mantenimiento **quiero** ver de un vistazo con qué drivers trabaja cada configuración **para** revisarlos sin entrar en el asistente.
- Una fila por configuración con estructura: Flota, Configuración (*Única* si la flota tiene una sola estructura), Estructura, Drivers (*Kilometraje, Ciclos*), Cálculo en SMS (*Sí* / *No*), Estado y Acciones.
- Filtros por flota y estructura.

### HU-13 · Modificar los drivers y el cálculo en SMS de una configuración
**Como** jefe de mantenimiento **quiero** cambiar los drivers de una configuración más adelante **para** ajustarlos cuando cambie la forma de mantener.
- *Modificar* en el menú de 3 puntos abre el mismo editor del paso 3, con su cálculo en SMS.
- Aviso *Solo afecta a esta configuración*: nombra las otras configuraciones que usan la estructura y aclara que no cambian. Si está activa, las plantillas nuevas pedirán los valores iniciales de los drivers añadidos.
- *Guardar cambios* solo se activa si hay cambios y no deja guardar un cálculo en SMS a medias.

---

## Épica F. Propiedades de categoría
Un único juego para todo el cliente: se aplica a todas las flotas.

### HU-55 · Asignar las propiedades de cada categoría
**Como** jefe de mantenimiento **quiero** decidir qué propiedades se registran para cada categoría de activo **para** que todas las flotas guarden la misma información.
- A la izquierda las 30 categorías del cliente con el nº de propiedades de cada una; a la derecha las propiedades de la categoría elegida.
- Selector *Asignadas (N) / Todas (42)*: se abre en *Asignadas* si la categoría tiene alguna; en *Todas*, las asignadas salen primero. A la izquierda, *Todas / Con propiedades*.
- 42 propiedades: las 12 anteriores más 30 de la lista del cliente. Sus tipos son una suposición.
- Aviso de que se aplica a todas las flotas. *Guardar cambios* pide confirmación: *¿Aplicar los cambios en N flotas?*.

### HU-15 · Guardar el histórico de una propiedad
**Como** jefe de mantenimiento **quiero** indicar si una propiedad guarda histórico **para** controlar cómo cambia el dato en el tiempo.
- Interruptor *Guardar histórico* (Sí / No) en cada propiedad asignada.

### HU-16 · Buscar categorías y propiedades
**Como** jefe de mantenimiento **quiero** buscar categorías y propiedades **para** encontrarlas en listas largas.
- Buscador en cada panel, compatible con los filtros de vista.

---

## Épica G. Cambio de número de serie *(en prueba)*
Para activos ya dados de alta, montados en una unidad o en almacén. Activos y nº de serie de ejemplo.

### HU-63 · Cambiar números de serie con una plantilla
**Como** jefe de mantenimiento **quiero** cambiar muchos números de serie a la vez **para** no hacerlo activo a activo.
- Pestaña *Con plantilla*.
  1. Dónde están: *Montados en unidades* o *En almacén*.
  2. Alcance: todas las flotas, una flota (todas sus unidades) o una unidad concreta; o todos los almacenes o uno. Opcionalmente, una categoría. Se ve cuántos activos entran.
  3. *Descargar plantilla*: ubicación, categoría, nº de serie actual y una columna vacía para el nuevo.
  4. Subir la plantilla rellena: si es correcta, lista de cambios (actual → nuevo) y *Aplicar cambios*; si tiene errores (repetido, ya existe, falta el actual), no se cambia nada y se muestran las filas.

### HU-64 · Cambiar el número de serie de activos concretos
**Como** jefe de mantenimiento **quiero** buscar un activo y cambiar su número de serie al momento **para** corregir casos sueltos.
- Pestaña *Activo concreto*: filtros por nº de serie actual y categoría, y botón *Buscar*. Hasta 50 resultados con su ubicación.
- Doble clic sobre el nº de serie (o Enter con el teclado) para editarlo en la fila. Enter guarda y Esc cancela. No deja poner uno que ya existe.
- Los cambiados muestran el nº anterior (*antes RU-3001-012*).

---

## Épica H. Almacenes *(en prueba)*

### HU-61 · Ver los almacenes
**Como** jefe de mantenimiento **quiero** ver los almacenes del cliente **para** saber dónde se guardan o mantienen los activos.
- Columnas: Nombre de almacén, Ubicación, Contacto (con el teléfono debajo), Uso (*Almacén*, *Mantenimiento*) y Acciones. Paginador con elementos por página.
- Estados: cargando, vacío y error.

### HU-62 · Añadir, modificar y eliminar un almacén
**Como** jefe de mantenimiento **quiero** mantener la lista de almacenes **para** que esté al día.
- *Añadir almacén*: nombre (obligatorio, único), ubicación, contacto, teléfono (validado) y uso (al menos uno, se pueden elegir los dos). *Añadir* se activa cuando lo obligatorio está completo.
- Menú de 3 puntos: *Modificar* (mismo dialog) y *Eliminar* (con confirmación).

---

## Pendientes: no están en el prototipo
| ID | Historia | Épica |
|---|---|---|
| HU-30 / HU-31 | Añadir o borrar extremos de la estructura de una configuración activa. *Cubierto en parte por HU-41*, desde el catálogo | Modificación de una configuración activa |
| HU-33 | Asignar propiedades al componente nuevo justo después de modificar la estructura | Modificación de una configuración activa |
| HU-34 / HU-35 | Cargar los datos de los activos nuevos en las unidades afectadas y ver las incompletas tras añadir una categoría. *En parte en HU-42* | Modificación de una configuración activa |
| HU-36 | Cargar los datos de un activo junto con sus hijos a la vez | Modificación de una configuración activa |
| HU-37 | Recepción en unidad: dar de alta un activo nuevo, con sus hijos, en una unidad | Recepciones (¿módulo Operación?) |
| HU-38 | Recepción en almacén: dar de alta un activo nuevo de una categoría que ya existe | Recepciones (¿módulo Operación?) |

## Sustituidas o descartadas
| ID | Qué pasó |
|---|---|
| HU-09 | Integrada en HU-67 (aviso de que la estructura no se podrá cambiar) |
| HU-10, HU-11, HU-12 | Integradas en HU-44 (valores por defecto y herencia de los drivers) |
| HU-14, HU-17 | Integradas en HU-55 y HU-56 |
| HU-18, HU-19, HU-20 | Sustituidas por HU-57 (matriz) y HU-60 (valores por configuración) |
| HU-26 | Integrada en HU-25 y HU-28 |
| HU-45 a HU-54 | Descartadas: perfiles comunes de drivers y de propiedades |
| HU-58 | Integrada en HU-05 (pestañas de consulta en el paso 1) |

## Preguntas abiertas
- ¿Qué rol puede configurar: jefe de mantenimiento, técnico o los dos?
- ¿Se puede finalizar una configuración con huecos sin datos y cargarlos después fuera de configuración?
- ¿Las recepciones (HU-37, HU-38) son de Configuración o de Operación?
- Tipos reales de las propiedades de hueco y de las 30 propiedades de categoría nuevas.
- Formas de cálculo en SMS: confirmar las cuatro y su descripción.
