# Contexto de la aplicación: Leadmind Trace

> Rellena cada sección con tus palabras; no hace falta que esté perfecto. Lo que quede vacío, Claude lo preguntará antes de asumirlo.

## Qué es
**Leadmind Trace** es una herramienta digital para controlar los **activos ferroviarios y su trazabilidad**: dónde está cada activo (en un almacén o montado en un hueco de una unidad) y su historial. También sirve para **gestionar el mantenimiento**.

## Modelo de dominio

Un **cliente** tiene una o varias **flotas**. Cada flota contiene uno o varios **grupos de trenes**. Cada grupo de trenes usa una **estructura**, que define la composición jerárquica de sus **activos**. Para cada estructura se indica **cuántas unidades (trenes)** hay dentro de la flota.

```
Cliente
├─ Estructuras (catálogo común del cliente) ← cada una con sus propiedades de hueco
├─ Propiedades de categoría (un único juego para todo el cliente)
└─ Flota (1..n)  ← en el prototipo, todas usan SMS
   └─ Configuración / grupo de trenes (1..n)
      ├─ usa → Estructura (1)  → jerarquía de huecos (ver ejemplo)
      ├─ drivers y cálculo de drivers para SMS (propios de esta flota + estructura)
      └─ nº de unidades (trenes) asignadas
```

### Qué pertenece a cada nivel (decidido 2026-11-04)
| Nivel | Qué tiene |
|---|---|
| **Cliente** | El catálogo de **estructuras**, que puede usar cualquier flota, y un **único juego de propiedades de categoría**, que se aplica a todas las flotas |
| **Estructura** | Su composición de huecos y **sus propiedades de hueco** (una sola definición por estructura) |
| **Flota** | Nombre y descripción. En el prototipo, todas usan SMS |
| **Configuración** (flota + estructura) | Nombre, descripción, la estructura, el nº de unidades, **sus drivers y su cálculo de drivers para SMS**, los valores de propiedades de hueco y la carga de datos (plantillas) |

### De qué depende cada cosa
- **Drivers**: de la **estructura y la flota**. Cada configuración marca los suyos sobre la **estructura entera de la unidad**, hueco a hueco (por ejemplo, ciclos en la Puerta 1 del Coche 2). Al marcar un hueco, los que cuelgan de él también lo tienen y lo heredan. Por ejemplo, la flota 1 con la estructura B y la flota 2 con la estructura B pueden tener drivers distintos. No hay catálogo común de drivers: el apartado **Configuración › Drivers** lista cada configuración (flota + estructura) y permite modificar sus drivers sin afectar a las demás.
- **Propiedades de categoría**: del **cliente**. Hay un solo juego, sin perfiles, y se aplica a todas las flotas. Se edita en **Configuración › Propiedades de categoría** o en el paso 4 del asistente, avisando de que afecta a todas las flotas.
- **Propiedades de hueco**: de la **estructura**. Cada estructura tiene las suyas y se editan en **Configuración › Estructuras** (pestaña Propiedades de hueco): ahí se elige **qué propiedades** tiene cada hueco. La estructura y sus propiedades van unidas: en el paso 1 del asistente se consultan en dos pestañas, sin poder modificarlas. Los **valores** son de cada configuración y se dan, de forma opcional, en el paso 2.
- *Sustituye a los perfiles comunes de drivers y de propiedades (opción B) y a los perfiles por defecto.*

### Reglas de las estructuras
- **Una sola versión**: no hay versiones ni variantes. Modificar una estructura **afecta a todas las configuraciones que la usan**.
- Una estructura en uso solo se modifica **por los extremos** (añadir o eliminar extremos).
- Antes de guardar un cambio se muestra su **impacto**: qué configuraciones y cuántas unidades se ven afectadas. Las unidades afectadas quedan **incompletas** hasta que se cargan los datos de los activos nuevos.

### Ejemplo de estructura: "Estructura 1"

Cada nodo es un **hueco**, es decir, una posición donde se monta un activo, **incluidos "Tren" y cada "Coche"**. Los coches, bogies, ejes y puertas que tienen el mismo número repiten la misma composición.

```
Estructura 1
└── Tren
    ├── Coche 1
    │   ├── Motor Coche
    │   ├── Puerta 1
    │   │   ├── Motor Puerta
    │   │   └── Tarjeta Electrónica
    │   ├── Puerta 2
    │   │   ├── Motor Puerta
    │   │   └── Tarjeta Electrónica
    │   ├── Bogie 1
    │   │   ├── Motor Bogie
    │   │   ├── Eje 1
    │   │   │   ├── Rueda 1
    │   │   │   └── Rueda 2
    │   │   └── Eje 2
    │   │       ├── Rueda 1
    │   │       └── Rueda 2
    │   └── Bogie 2          (igual que Bogie 1)
    ├── Coche 2              (igual que Coche 1)
    └── Coche 3              (igual que Coche 1)
```

**Tamaño resultante** (útil para generar datos coherentes):
- Por coche: 1 coche + 1 motor de coche + 2 puertas × 3 + 2 bogies × 8 = **24 huecos**
- Por tren: 1 tren + 3 coches × 24 = **73 huecos**
- Por coche: 2 puertas, 2 bogies, 4 ejes y 8 ruedas. Por tren: 6 puertas, 6 bogies, 12 ejes y 24 ruedas.

**Ruta de un hueco** (cómo mostrarla en la interfaz): `Coche 2 › Bogie 1 › Eje 2 › Rueda 1`

Tipos de activo (categorías) que aparecen: Tren, Coche, Motor Coche, Puerta, Motor Puerta, Tarjeta Electrónica, Bogie, Motor Bogie, Eje, Rueda.

### Reglas
- **Varios grupos de trenes pueden compartir la misma estructura.**
- A cada grupo de trenes se le asigna un **número de unidades (trenes)**, que pertenecen a ese grupo y por tanto siguen su estructura.
- Un **hueco** es cada posición de la estructura donde se monta un activo. Por ejemplo: "Coche 1 › Bogie delantero › Eje 2 › Rueda izquierda". Las *propiedades de hueco* describen esa posición.
- Cada **unidad** se identifica con un **número de serie de 4 dígitos**, por ejemplo `1001` o `3020`.

## Para quién
<!-- Tipos de usuario (rol, qué hacen en su día a día, nivel técnico) y qué puede hacer cada uno (permisos). -->

Son perfiles técnicos de mantenimiento ferroviario. Conocen bien el tren y sus componentes, pero no tienen por qué ser expertos en informática.

| Rol | Qué hace | Permisos |
|---|---|---|
| Técnico de mantenimiento | Consulta activos y registra operaciones (recepciones, montajes…) | *por confirmar* |
| Jefe de mantenimiento | Supervisa flotas y unidades y gestiona el mantenimiento | *por confirmar* (¿también configuración?) |

## Módulos o secciones principales
De momento hay tres. La descripción de cada uno es provisional: *por confirmar*.

| Módulo | Para qué sirve (provisional) |
|---|---|
| **Consulta** | Buscar y ver activos, unidades, estructuras y su trazabilidad (historial) |
| **Operación** | Registrar acciones sobre los activos: recepción en almacén, recepción en unidad, montajes y desmontajes… |
| **Configuración** | Definir clientes, flotas, grupos de trenes, estructuras, categorías y propiedades (de hueco y de categoría), drivers, almacenes y cambio de número de serie |

## Nomenclatura acordada (obligatoria)
Usa **siempre** el término acordado en textos de interfaz, datos, historias y flujos. Los términos anteriores **no deben aparecer** en ningún sitio.

| Término acordado ✅ | Término anterior ❌ (no usar) |
|---|---|
| Estructura | Árbol / configuración |
| Propiedad de hueco | Atributo de posición |
| Propiedad de categoría | Atributo de categoría |
| Categoría | Tipo de componente |
| Activo | Componente (un activo es una pieza real que ya tiene nº de serie) |
| Almacén | Taller |
| Recepción en almacén | Alta de componentes en taller / Recepción en taller |
| Recepción en unidad | Alta de componentes en unidad |

> La palabra **"taller" no aparece en ningún sitio de la aplicación**: siempre es "almacén".

## Glosario del dominio
<!-- Términos propios y su significado, para usarlos bien en textos y datos. -->

| Término | Significado |
|---|---|
| Cliente | También llamado proyecto. Tiene una o varias flotas |
| Flota | Conjunto de trenes de un cliente. Es el paraguas de una o varias configuraciones |
| Configuración (grupo de trenes) | Parte de una flota que comparte la misma estructura. Tiene nombre, descripción, estructura, nº de unidades, drivers, cálculo de drivers para SMS, valores de propiedades de hueco y datos cargados. Si la flota tiene una sola estructura, se llama como la flota (configuración única) |
| Estado de configuración | **En configuración** (alta no finalizada, tenga o no estructura) o **Activa** (finalizada; sus unidades están operativas y puede haber huecos sin activos). La flota sin configuraciones aparece como **Sin configurar** |
| Unidad | Un tren concreto de una configuración. Se identifica con un nº de serie de 4 dígitos (1001, 3020…) |
| Estructura | Composición jerárquica de huecos que define cómo está formada una unidad. Es un catálogo común para todas las flotas del cliente |
| Estructura confirmada (fijada) | Una vez se pasa del paso 1 del asistente, la estructura de la configuración ya no se puede cambiar. Si hace falta otra, se crea de nuevo la configuración |
| Hueco | Cada posición de la estructura donde se monta un activo. Por ejemplo: Coche 1 › Bogie 1 › Eje 2 › Rueda 1 |
| Posición | Dónde está un activo (su hueco) dentro de la unidad, desde el tren: Tren › Coche 1 › Bogie 1 |
| Nº de posición relativa | Número de un hueco respecto a su padre: Tren › Coche 5 › Bogie 1 es el primer bogie del coche 5. Es la que usa el prototipo |
| Nº de posición absoluta | Número de un hueco respecto al total de huecos de su misma categoría en la unidad: Tren › Coche 5 › Bogie 10 es el décimo bogie del tren |
| Extremo | Nivel más bajo de cada rama: un hueco sin hijos. Una estructura en uso solo se modifica añadiendo o quitando extremos |
| Activo | Elemento físico con nº de serie: coche, bogie, eje, rueda, motor, puerta, tarjeta electrónica… Está montado en un hueco de una unidad o guardado en un almacén |
| Categoría | Tipo de activo (Coche, Bogie, Eje, Rueda, Gearbox, SIV…) |
| Propiedad de categoría | Dato que se registra para todos los activos de una categoría. Hay un único juego para todo el cliente y se aplica a todas las flotas |
| Histórico | Marca de una propiedad de categoría: se guarda la evolución de su valor en el tiempo |
| Propiedad de hueco | Propiedad que se asigna a un hueco (posición) de la estructura (LOCATION, CAF-CODE…). La estructura define qué huecos la tienen; sus valores se dan en cada configuración y no guardan histórico |
| Driver | Forma de contar la vida de un activo: kilometraje, ciclos u horas. Son propios de cada configuración |
| Heredable | Solo para drivers: el valor del driver viene del hueco padre y no se registra aparte. Por defecto, el km lo tienen todos los huecos y es heredable en todos menos en la unidad, que no tiene padre |
| SMS | Herramienta hermana de Leadmind Trace para planificar los mantenimientos. Recibe los drivers de cada configuración |
| Cálculo de drivers para SMS | Qué drivers de una configuración se envían a SMS y cómo se calcula cada uno. Opcional y propio de cada configuración |
| Forma de cálculo | Cómo calcula SMS un driver: por Flota, por Línea, por Categoría o por Categoría y posición |
| Plantilla | Excel que genera la aplicación, una por categoría, según la estructura, las propiedades de categoría y los drivers, para cargar los datos de los activos. Campos obligatorios: en la plantilla de unidades, nº de serie, km y fecha; en el resto, nº de serie de la unidad, nº de serie del activo y km. Después van los otros drivers elegidos (ciclos, horas) y las propiedades de categoría asignadas |
| Plantilla de unidades (primer nivel) | Plantilla de la categoría raíz (Tren), con el nº de serie, el km y la fecha de cada unidad. Es obligatoria para finalizar una configuración y para añadir unidades |
| Almacén | Lugar donde se guardan o mantienen los activos que no están montados en una unidad. Su uso puede ser Almacén, Mantenimiento o los dos |
| Cambio de número de serie | Sustitución del nº de serie de activos ya dados de alta, de forma masiva con una plantilla o de un activo concreto |
| Recepción en almacén | Dar de alta activos en un almacén |
| Recepción en unidad | Dar de alta activos directamente en una unidad |

## Formatos y convenciones
<!-- Fechas, horas, números, unidades de medida, idioma, mayúsculas… -->
- Fechas:
- Números y decimales:
- Unidades:

## Restricciones y contexto técnico
<!-- Ej.: aplicación de escritorio, uso en almacén, integraciones con otros sistemas, cosas que no se pueden cambiar. -->
