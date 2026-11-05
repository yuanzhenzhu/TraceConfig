# Backlog: módulo Configuración

Borrador sacado de los tableros de Figma (2026-11-03), con la nomenclatura acordada ya aplicada. Cada fila se convertirá en `HU-XX-nombre.md` cuando la trabajemos.

Leyenda del origen: **T** = viene del tablero; **N** = historia nueva que propone Claude porque el flujo la necesita.

## Épica A: Alta inicial de una configuración

### A1. Iniciar configuración
| ID | Historia | Origen |
|---|---|---|
| HU-01 | Ver el listado de configuraciones de una flota con su estado (En configuración / Activa), para saber qué hay y por dónde seguir | N |
| HU-02 | Iniciar una configuración en una flota nueva, con nombre y descripción, para identificarla | T |
| HU-03 | Iniciar una nueva configuración en una flota existente, para gestionar varias estructuras dentro de la misma flota | T |
| HU-04 | Indicar el número de unidades de la configuración, para generar las unidades que comparten la estructura (los nº de serie llegan en la plantilla de primer nivel) | T |

### A2. Estructura
| ID | Historia | Origen |
|---|---|---|
| HU-05 | Seleccionar una estructura existente y previsualizarla, para verificarla antes de trabajar con ella | T |
| HU-06 | Crear una estructura nueva partiendo de una existente o desde cero, para reutilizar lo ya definido | T |
| HU-07 | Construir la estructura arrastrando y soltando, copiando, pegando y eliminando, para montarla de forma ágil | T |
| HU-08 | Disponer de una lista de categorías desde la que añadir elementos a la estructura | T |
| HU-09 | Saber que la estructura solo podrá modificarse después por los extremos, para no bloquearme más tarde | T |

### A3. Drivers
| ID | Historia | Origen |
|---|---|---|
| HU-10 | Que todos los huecos tengan por defecto el driver kilometraje y que sea heredable en todos menos en la unidad (tener un driver y que sea heredable son dos marcas distintas) | T |
| HU-11 | Elegir otros drivers (ciclos, horas) para algunas categorías | T |
| HU-12 | Que los drivers de ciclos y horas se marquen por defecto en los hijos y se hereden a todo salvo al padre | T |
| HU-13 | Cambiar la asignación de drivers más adelante | T |
| HU-44 | Marcar en el asistente los drivers propios de la configuración (flota + estructura), partiendo del kilometraje por defecto | N |

### A4. Propiedades de categoría
| ID | Historia | Origen |
|---|---|---|
| HU-14 | Ver las categorías de la estructura junto a la lista de propiedades de categoría y asignarlas | T |
| HU-15 | Marcar si una propiedad guarda histórico o no, para controlar el dato en el tiempo | T |
| HU-16 | Buscar y filtrar categorías y propiedades, para que la selección sea ágil | T |
| HU-17 | Modificar la asignación de propiedades de categoría más adelante | T |

### A5. Propiedades de hueco
| ID | Historia | Origen |
|---|---|---|
| HU-18 | Ver los huecos junto a la lista de propiedades de hueco y asignarlas | T |
| HU-19 | Seleccionar varios huecos de la misma categoría a la vez, para asignarles las propiedades de una vez | T |
| HU-20 | Rellenar el valor de las propiedades de hueco ahora o más adelante | T |

### A6. Cálculos en SMS (opcional, según cliente)
| ID | Historia | Origen |
|---|---|---|
| HU-21 | Indicar, de forma opcional en el paso 3, qué drivers se envían a SMS y cómo se calcula cada uno (flota, línea, categoría, o categoría y posición). Como los drivers, es de cada configuración (flota + estructura) | T |

### A7. Carga de datos mediante plantillas
| ID | Historia | Origen |
|---|---|---|
| HU-22 | Descargar las plantillas generadas por categoría según la estructura, las propiedades y los drivers | T |
| HU-23 | Subir las plantillas rellenas poco a poco | T |
| HU-24 | Ver los errores de validación de una plantilla subida, para corregirlos | N |
| HU-25 | Ver qué plantillas están cargadas y cuáles pendientes | T |

### A8. Estado y finalización
| ID | Historia | Origen |
|---|---|---|
| HU-26 | Ver cuántas unidades están terminadas y cuántas en configuración | T |
| HU-27 | Salir y volver a una configuración no terminada sin perder nada | T |
| HU-28 | Finalizar la configuración para que la flota quede activa y lista para usar | T |
| HU-29 | Descartar una configuración que está en configuración y que ya no se necesita | N |

## Épica E: Catálogo de estructuras (nuevo apartado)
La estructura es común a todo el cliente: modificarla afecta a todas las configuraciones que la usan. No hay versiones ni variantes.

| ID | Historia | Origen |
|---|---|---|
| HU-39 | Ver el catálogo de estructuras del cliente, con cuántas configuraciones y unidades usan cada una | N |
| HU-40 | Crear una estructura nueva en el catálogo, desde cero o partiendo de otra | N |
| HU-41 | Modificar una estructura en uso por los extremos, viendo antes qué configuraciones y unidades se verán afectadas | N |
| HU-42 | Ver qué unidades han quedado incompletas por un cambio de estructura, para cargar sus datos | N |
| HU-43 | Eliminar una estructura que no usa ninguna configuración | N |

## Drivers y propiedades (decidido 2026-11-04)
- **Drivers**: propios de cada configuración (flota + estructura). Sin catálogo común. Sustituye a la épica D (HU-45 a 48 y 53), que se descarta.
- **Propiedades de categoría**: un único juego del cliente para todas las flotas. Sustituye a la épica P (HU-49 a 52 y 54).
- **Propiedades de hueco**: de cada estructura, en el catálogo de estructuras.

| ID | Historia | Origen |
|---|---|---|
| HU-55 | Editar las propiedades de categoría del cliente en su apartado, sabiendo que se aplican a todas las flotas | N |
| HU-56 | Editar en el asistente las propiedades de categoría de las categorías de la estructura, con aviso de que afectan a todas las flotas | N |
| HU-57 | Editar las propiedades de hueco de una estructura desde el catálogo de estructuras, viendo a qué flotas afecta | N |
| HU-58 | Consultar en el paso 1 del asistente, en dos pestañas, la estructura y sus propiedades de hueco, sin poder modificarlas | N |
| HU-60 | Dar valor, de forma opcional, a las propiedades de hueco que define la estructura, propios de cada configuración (paso 2) | N |
| HU-59 | Ver en el apartado Drivers los drivers de cada configuración (flota + estructura) y modificarlos sin afectar a otras flotas con la misma estructura | N |

## Almacenes y cambio de número de serie (en prueba, 2026-11-05)
| ID | Historia | Origen |
|---|---|---|
| HU-61 | Ver los almacenes del cliente con su ubicación, contacto, teléfono y uso (almacén, mantenimiento) | N |
| HU-62 | Añadir, modificar y eliminar un almacén (nombre y uso obligatorios) | N |
| HU-63 | Cambiar el nº de serie de muchos activos con una plantilla: elegir si están en unidades o en almacén y el alcance (todas las flotas, una flota, una unidad, un almacén y, opcionalmente, una categoría), descargarla con los nº de serie actuales, subirla con los nuevos, revisar y aplicar | N |
| HU-64 | Buscar un activo concreto del cliente por su nº de serie y cambiarlo, sin repetir uno que ya existe | N |

## Épica B: Modificación de una configuración activa
| ID | Historia | Origen |
|---|---|---|
| HU-30 | Añadir una categoría nueva en los extremos de la estructura (desde el catálogo de estructuras, ver HU-41) | T |
| HU-31 | Borrar extremos de la estructura (desde el catálogo de estructuras, ver HU-41) | T |
| HU-32 | Añadir unidades nuevas a una configuración existente | T |
| HU-33 | Asignar propiedades al nuevo componente justo después de modificar la estructura | T |
| HU-34 | Cargar una plantilla con los datos de los activos nuevos para todas las unidades afectadas | T |
| HU-35 | Ver las unidades incompletas después de añadir una categoría | T |
| HU-36 | Cargar los datos de un activo junto con sus hijos a la vez, sin ir uno por uno | T |

## Épica C: Recepciones del día a día (¿módulo Operación?)
| ID | Historia | Origen |
|---|---|---|
| HU-37 | Recepción en unidad: dar de alta un activo físico nuevo, con sus hijos, en una unidad | T |
| HU-38 | Recepción en almacén: dar de alta un activo nuevo de una categoría que ya existe en la estructura | T |

## Preguntas abiertas
- ¿Se puede crear un hueco y finalizar la configuración sin datos, y cargar el dato después fuera de configuración?
- ¿Conviene separar los drivers de las propiedades de activo? (nota del equipo)
- ~~Las propiedades de hueco dependen de la estructura y no de una flota~~ → **Resuelto:** las propiedades de categoría, las de hueco y el SMS son **de la flota**. Las comparten todas sus configuraciones.
- ~~¿Los drivers son de la flota o de la configuración?~~ → **Resuelto:** son un **catálogo común del cliente** (Configuración › Drivers), como las estructuras. Cada configuración usa un perfil de drivers de su estructura.
- ¿La épica C pertenece a Configuración o a Operación?
