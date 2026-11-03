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
| HU-44 | Elegir si los drivers de la configuración son compartidos con la flota o propios | N |

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
| HU-21 | Enviar a SMS los datos de configuración de la flota (flota o línea, driver y forma de cálculo) | T |

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
- ~~¿Los drivers son de la flota o de la configuración?~~ → **Resuelto:** lo **elige el usuario** en el paso Drivers: *compartidos con la flota* (los usan las configuraciones de la flota con la misma estructura que elijan esa opción) o *propios de esta configuración*.
- ¿La épica C pertenece a Configuración o a Operación?
