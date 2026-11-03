# HU-01: Listado de flotas y configuraciones

**Estado:** borrador, pendiente de validar
**Módulo:** Configuración · **Épica:** A (alta inicial)
**Origen:** historia nueva propuesta por Claude (no está en el tablero). Sin referencia visual: el diseño sigue solo el sistema de diseño.

## Historia
**Como** jefe de mantenimiento,
**quiero** ver todas las flotas con sus configuraciones y el estado de cada una,
**para** saber qué está listo para usar, qué está a medias y por dónde seguir.

## Decisión: el estado es de la configuración, no de la flota
Una flota puede tener a la vez configuraciones terminadas y otras sin terminar, así que **no se le asigna un estado único**.
- **Cada configuración** (una estructura con sus unidades dentro de una flota) tiene su estado: **En configuración** o **Activa**.
- **La flota** muestra un **resumen** de sus configuraciones, con un tag por estado y su recuento. Por ejemplo: `1 Activa` + `1 En configuración`.
- Una flota sin ninguna configuración muestra **Sin configurar**.

| Estado | Dónde se usa | Tag del sistema | Significado |
|---|---|---|---|
| En configuración | Configuración | `tagSemantic-status` Attention | El alta inicial no está finalizada; sus unidades aún no se pueden usar en operación |
| Activa | Configuración | `tagSemantic-status` Success | Finalizada; sus unidades están operativas |
| Sin configurar | Flota | `tagSemantic-status` Neutral | La flota existe pero no tiene ninguna configuración |

## Propuesta de tabla
Una sola tabla **agrupada y desplegable**: una fila por flota y, al desplegarla, una fila por configuración.

```
FLOTA            DESCRIPCIÓN              CONFIGURACIONES   UNIDADES   ESTADO                          
› F1000          Metro Línea 1            2                 24         [1 Activa] [1 En configuración]  ⋮
   └ Estructura 1 · Serie 1000            ─                 16         [Activa]        16/16 terminadas  Ver ⋮
   └ Estructura 2 · Serie 1100            ─                 8          [En configuración] 3/8 terminadas  Continuar ⋮
› F2000          Tranvía Zaragoza         1                 12         [1 Activa]                       ⋮
  F3000          Cercanías Norte          0                 —          [Sin configurar]   Iniciar configuración ⋮
```

- **Fila de flota:** Flota, Descripción, nº de configuraciones, total de unidades, resumen de estado y menú (⋮): Editar flota, Añadir configuración.
- **Fila de configuración:**
  - Datos: estructura, nº de unidades, estado y **progreso** (unidades terminadas sobre el total; solo se muestra si está En configuración).
  - Acción directa: **Continuar** (En configuración) o **Ver** (Activa).
  - Menú: Modificar, Descartar (solo En configuración).
- **Filtros:** Flota, Estructura y **Estado** (este último es nuevo y sirve para encontrar rápido lo que está a medias).
- Las flotas con algo **En configuración** salen desplegadas por defecto.

## Criterios de aceptación
1. Se ve una fila por flota con el resumen de estado de sus configuraciones.
2. Al desplegar una flota se ven sus configuraciones con estado y progreso.
3. Desde una configuración En configuración, **Continuar** lleva al paso donde se quedó.
4. **Añadir flota** (acción principal del header) inicia HU-02.
5. Desde el menú de una flota, **Añadir configuración** inicia HU-03.
6. Los filtros Flota, Estructura y Estado se pueden combinar.
7. **Estados de pantalla:**
   - Vacío: no hay flotas, se muestra `empty-state` con el botón "Añadir flota".
   - Cargando: `matProgressSpinner`.
   - Error al cargar: `banner` de error con "Reintentar".
   - Sin resultados de filtro: `empty-state` con el icono `search_off`.
8. Si hay muchas filas, `matPaginator` debajo de la tabla.

## Pendiente de validar
- ¿Resumen de estado con tags y recuento en la fila de flota? (propuesta de Claude)
- ¿Nombre "Sin configurar" para una flota sin configuraciones?
- ¿"Descartar" una configuración a medias está permitido? (HU-29)
