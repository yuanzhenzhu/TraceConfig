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
└─ Flota (1..n)  ← cálculos en SMS
   └─ Configuración / grupo de trenes (1..n)
      ├─ usa → Estructura (1)  → jerarquía de huecos (ver ejemplo)
      ├─ drivers (propios de esta flota + estructura)
      └─ nº de unidades (trenes) asignadas
```

### Qué pertenece a cada nivel (decidido 2026-11-04)
| Nivel | Qué tiene |
|---|---|
| **Cliente** | El catálogo de **estructuras**, que puede usar cualquier flota, y un **único juego de propiedades de categoría**, que se aplica a todas las flotas |
| **Estructura** | Su composición de huecos y **sus propiedades de hueco** (una sola definición por estructura) |
| **Flota** | Nombre, descripción y **cálculos en SMS** |
| **Configuración** (flota + estructura) | Nombre, la estructura, el nº de unidades, **sus drivers** y la carga de datos (plantillas) |

### De qué depende cada cosa
- **Drivers**: de la **estructura y la flota**. Cada configuración marca los suyos sobre el árbol de categorías de su estructura. Por ejemplo, la flota 1 con la estructura B y la flota 2 con la estructura B pueden tener drivers distintos. No hay catálogo común de drivers: el apartado **Configuración › Drivers** lista cada configuración (flota + estructura) y permite modificar sus drivers sin afectar a las demás.
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
- Un **hueco** es cada posición de la estructura donde se monta un activo. Por ejemplo: "Coche 1 › Bogie delantero › Eje 2 › Rueda izquierda". Las *propiedades de hueco* describen esa posición y las *propiedades de activo* describen el activo montado en ella.
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
| **Configuración** | Definir clientes, flotas, grupos de trenes, estructuras, categorías y propiedades (de hueco, de activo y de categoría) |

## Nomenclatura acordada (obligatoria)
Usa **siempre** el término acordado en textos de interfaz, datos, historias y flujos. Los términos anteriores **no deben aparecer** en ningún sitio.

| Término acordado ✅ | Término anterior ❌ (no usar) |
|---|---|
| Estructura | Árbol / configuración |
| Propiedad de hueco | Atributo de posición |
| Propiedad de activo | Atributo de activo |
| Propiedad de categoría | Atributo de categoría |
| Categoría | Tipo de componente |
| Almacén | Taller |
| Recepción en almacén | Alta de componentes en taller / Recepción en taller |
| Recepción en unidad | Alta de componentes en unidad |

> La palabra **"taller" no aparece en ningún sitio de la aplicación**: siempre es "almacén".

## Glosario del dominio
<!-- Términos propios y su significado, para usarlos bien en textos y datos. -->

| Término | Significado |
|---|---|
| Cliente | Empresa operadora; tiene una o varias flotas |
| Flota | Conjunto de trenes de un cliente; contiene uno o varios grupos de trenes |
| Grupo de trenes | Conjunto de trenes de una flota que comparten la misma estructura |
| Unidad | Un tren concreto de un grupo; se identifica con un nº de serie de 4 dígitos (1001, 3020…) |
| Estructura | Composición jerárquica de activos que define cómo está formado un tren del grupo |
| Hueco | Cada posición de la estructura donde se monta un activo |
| Activo | Elemento físico de la estructura: coche, bogie, eje, rueda, motor, puerta, tarjeta electrónica… |
| Categoría | Tipo de componente o activo (Coche, Bogie, Eje, Rueda, Puerta, Motor Puerta…) |
| Almacén | Lugar donde se guardan los activos que no están montados en una unidad |
| Configuración | Una parte de una flota (un grupo de trenes) con su estructura, su nº de unidades, sus drivers y sus datos cargados. La **flota es el paraguas** y puede tener varias configuraciones; el SMS es de la flota |
| Estado de configuración | **En configuración** mientras no se ha finalizado, y **Activa** cuando ya está finalizada. Las unidades de la configuración heredan ese estado. Sustituye a "temporal" y "activo" (propuesta pendiente de validar) |
| Driver | Forma de contar la vida de un activo. De momento hay tres: **kilometraje (km)**, **ciclos** y **horas**; puede haber más en el futuro. Cada hueco tiene dos marcas por driver: **tenerlo** y que sea **heredable** |
| Propiedad de categoría | Propiedad que se registra para una categoría de activo (y si guarda histórico). Hay un único juego para todo el cliente |
| Propiedad de hueco | Propiedad que describe una posición de la estructura. La estructura define cuáles tiene cada hueco y cada configuración les da valor (opcional) |
| Heredable | Marca de un driver en un hueco: su valor viene del padre y no se registra aparte. Por defecto, el km lo **tienen** todos los huecos y es **heredable** en todos menos en la unidad, que no tiene padre |
| Histórico | Marca de una propiedad de categoría que indica que se guarda la evolución de su valor en el tiempo |
| Plantilla | Excel que genera la aplicación, por categoría, según la estructura, las propiedades y los drivers, para cargar los datos de los activos |
| SMS | Herramienta hermana e independiente de Leadmind Trace para **planificar los mantenimientos**. Recibe datos de la configuración de la flota |
| Recepción en almacén | Dar de alta activos en el almacén |
| Recepción en unidad | Dar de alta activos directamente en una unidad |

## Formatos y convenciones
<!-- Fechas, horas, números, unidades de medida, idioma, mayúsculas… -->
- Fechas:
- Números y decimales:
- Unidades:

## Restricciones y contexto técnico
<!-- Ej.: aplicación de escritorio, uso en almacén, integraciones con otros sistemas, cosas que no se pueden cambiar. -->
