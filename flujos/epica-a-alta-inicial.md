# Flujo: épica A, alta inicial de una configuración

**Estado:** validado con cambios (2026-11-03)
**Historias:** HU-01 a HU-29 (ver `historias/backlog-configuracion.md`)

## Idea general
La **flota** es el paraguas: tiene nombre y descripción. Dentro de ella hay una o varias **configuraciones**, cada una una parte de la flota con su propia estructura y su número de unidades, y con nombre y descripción propios. Por ejemplo, la flota F1000 puede tener "Serie A", que usa Estructura 1 con 16 unidades, y "Serie B", que usa Estructura 2 con 8 unidades.

El alta inicial es un **asistente por pasos** (`stepper-horizontal`) que se abre desde el listado de flotas (HU-01).
- Los pasos **obligatorios** son Estructura, Unidades y Carga de datos.
- Los pasos **opcionales** (Drivers, Propiedades de categoría, Propiedades de hueco y SMS) se pueden **saltar** y completar más tarde.
- A partir del paso Unidades, la configuración **se guarda sola** con estado **En configuración**. Se puede salir y volver con **Continuar**.

## Diagrama

```mermaid
flowchart TD
    L[HU-01 Listado de flotas y configuraciones]

    L -->|Añadir flota| DF[Dialog Nueva flota<br/>nombre + descripción · HU-02]
    L -->|Menú flota › Añadir configuración| P1
    L -->|Continuar| RET[Paso donde se quedó · HU-27]
    DF -->|Crear| P1
    DF -->|Cancelar| L

    subgraph ASISTENTE [Asistente de configuración]
      P1[1 · Datos y estructura<br/>nombre + descripción de la configuración<br/>obligatorio y bloqueante]
      P1 --> E1{¿Estructura existente?}
      E1 -->|Sí| E2[Elegir de la lista + previsualizar · HU-05]
      E1 -->|No, crear nueva| E3[Nombre + descripción<br/>partir de una existente o de cero · HU-06]
      E3 --> E4[Editor de estructura<br/>paleta de categorías · arrastrar · copiar · pegar · eliminar<br/>HU-07, HU-08, HU-09]
      E2 --> P2
      E4 --> P2

      P2[2 · Unidades · obligatorio<br/>solo el nº de unidades · HU-04]
      P2 -->|Se guarda como En configuración| P3

      P3[3 · Drivers · opcional<br/>km por defecto · ciclos y horas · herencia · HU-10..13]
      P3 --> P4[4 · Propiedades de categoría · opcional<br/>asignar · histórico · buscador · HU-14..17]
      P4 --> P5[5 · Propiedades de hueco · opcional<br/>selección múltiple · valores ahora o después · HU-18..20]
      P5 --> S{¿El cliente usa SMS?}
      S -->|Sí| P6[6 · Cálculos en SMS · opcional · HU-21]
      S -->|No| P7
      P6 --> P7

      P7[7 · Carga de datos · obligatorio el primer nivel<br/>descargar plantillas por categoría · subir · HU-22..25]
      P7 --> V{¿Plantilla válida?}
      V -->|No| ERR[Ver errores y corregir · HU-24] --> P7
      V -->|Sí| N1{¿Cargada la plantilla<br/>de primer nivel: unidades?}
      N1 -->|No| P7
      N1 -->|Sí| P8

      P8[8 · Resumen y finalizar<br/>unidades terminadas / en configuración · HU-26]
    end

    P8 -->|Finalizar · HU-28| OK[Configuración Activa<br/>snackbar: Configuración finalizada]
    OK --> L

    P2 -. Guardar y salir .-> L
    P5 -. Guardar y salir .-> L
    P7 -. Guardar y salir .-> L
    L -. Menú › Descartar · HU-29 .-> DEL[Dialog de confirmación] --> L
```

## Pantallas que salen del flujo
| # | Pantalla | Componentes principales |
|---|---|---|
| 0 | Listado de flotas y configuraciones | navbar, header, filtros (matSelect), tabla (matCell), tagSemantic-status, matPaginator, empty-state |
| 0b | Dialog "Nueva flota" (nombre y descripción de la flota) | dialog-2, matFormField ×2 |
| 1a | Datos y estructura: nombre y descripción de la configuración + elegir estructura existente | matFormField ×2, matRadioButton o matList, previsualización del árbol, matTabs (Existente / Nueva) |
| 1b | Estructura: editor | paleta de categorías (matList + buscador), árbol editable, matMenu (copiar, pegar, eliminar), banner informativo "solo se podrá modificar por los extremos" |
| 2 | Unidades | matFormField (nº de unidades). Los nº de serie llegan después en la plantilla de primer nivel |
| 3 | Drivers | árbol de la estructura con matCheckbox km / ciclos / horas por categoría |
| 4 | Propiedades de categoría | dos columnas: categorías · propiedades (matCheckbox + toggle de histórico), buscador |
| 5 | Propiedades de hueco | árbol de huecos con selección múltiple, panel de propiedades y valores |
| 6 | Cálculos en SMS | matSelect (flota o línea, driver), matRadioButton (forma de cálculo) |
| 7 | Carga de datos | tabla de plantillas por categoría (Pendiente / Cargada / Con errores), Descargar / Subir, uploader, banner de errores |
| 8 | Resumen y finalizar | matCard de resumen por paso, progreso de unidades, botón Finalizar (activo cuando la plantilla de primer nivel está cargada) |

Hay un elemento común a todos los pasos del asistente: el `stepper-horizontal` arriba, con un pie fijo que tiene **Anterior** (outlined), **Guardar y salir** (text) y **Siguiente / Finalizar** (filled).

## Decisiones validadas
1. **Flota y configuración:** la flota es el paraguas, con nombre y descripción. Cada configuración es una parte de la flota con su estructura y tiene también nombre y descripción.
2. **Unidades:** en el paso 2 solo se indica cuántas. Los nº de serie y el resto de datos de la unidad (fecha, km) llegan en la **plantilla de primer nivel**.
3. **Finalizar:** se puede finalizar en cuanto está cargada la plantilla de **primer nivel (unidades)**. El resto de plantillas se puede completar después.
4. **Cambios de estructura:** solo en los **extremos** (eliminar o cambiar extremos). La construcción completa con arrastrar y soltar solo es posible mientras se crea la estructura en el paso 1.
5. **Orden de los pasos opcionales:** drivers → propiedades de categoría → propiedades de hueco → SMS.

## Decisiones de Claude (siguen como propuesta)
1. **Punto de guardado:** la configuración se crea, en estado En configuración, al completar el paso **Unidades**. Si sales antes, no se guarda nada y se avisa con un dialog.
2. **Pasos opcionales** con el botón "Omitir paso". En el stepper se marcan como *pendiente* y no como *hecho*.
3. **Navegación libre** hacia atrás por el stepper. Hacia delante, solo cuando los obligatorios están completos.
4. **SMS** solo aparece si el cliente lo tiene contratado.
