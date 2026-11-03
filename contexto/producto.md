# Contexto de la aplicación

> Rellena cada sección con tus palabras; no hace falta que esté perfecto. Lo que quede vacío, Claude lo preguntará antes de asumirlo.

## Qué es
<!-- Nombre del producto y en una o dos frases qué hace y qué problema resuelve. -->

## Modelo de dominio

Un **cliente** tiene una o varias **flotas**. Cada flota contiene uno o varios **grupos de trenes**. Cada grupo de trenes usa una **estructura**, que define la composición jerárquica de sus **activos**. Para cada estructura se indica **cuántas unidades (trenes)** hay dentro de la flota.

```
Cliente
└─ Flota (1..n)
   └─ Grupo de trenes (1..n)
      ├─ usa → Estructura (1)
      │        └─ jerarquía de activos, por ejemplo:
      │           Coche
      │           ├─ Bogie
      │           │  ├─ Eje
      │           │  │  └─ Rueda
      │           │  └─ Motor
      │           ├─ Puerta
      │           └─ Tarjeta electrónica
      └─ nº de unidades (trenes) en la flota
```

Ejemplos de activos: coches, bogies, ejes, ruedas, motores, puertas, tarjetas electrónicas. (La jerarquía del diagrama es ilustrativa.)

### Reglas
- **Varios grupos de trenes pueden compartir la misma estructura.**
- A cada grupo de trenes se le asigna un **número de unidades (trenes)**, que pertenecen a ese grupo y por tanto siguen su estructura.
- Un **hueco** es cada posición de la estructura donde se monta un activo. Por ejemplo: "Coche 1 › Bogie delantero › Eje 2 › Rueda izquierda". Las *propiedades de hueco* describen esa posición y las *propiedades de activo* describen el activo montado en ella.
- Cada **unidad** se identifica con un **número de serie de 4 dígitos**, por ejemplo `1001` o `3020`.

## Para quién
<!-- Tipos de usuario (rol, qué hacen en su día a día, nivel técnico) y qué puede hacer cada uno (permisos). -->

| Rol | Qué hace | Permisos |
|---|---|---|
|  |  |  |

## Módulos o secciones principales
<!-- Ej.: Configuración, Gestión de unidades, Planificador, Panel de negocio… y para qué sirve cada uno. -->

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
| Categoría |  |
| Almacén |  |
| Recepción en almacén |  |
| Recepción en unidad |  |

## Formatos y convenciones
<!-- Fechas, horas, números, unidades de medida, idioma, mayúsculas… -->
- Fechas:
- Números y decimales:
- Unidades:

## Restricciones y contexto técnico
<!-- Ej.: aplicación de escritorio, uso en almacén, integraciones con otros sistemas, cosas que no se pueden cambiar. -->
