# Flujo: épica A, alta inicial de una configuración

**Estado:** validado con cambios (2026-11-03)
**Historias:** HU-01 a HU-29 (ver `historias/backlog-configuracion.md`)

## Idea general
La **flota** es el paraguas: tiene nombre y descripción. Dentro de ella hay una o varias **configuraciones**, cada una una parte de la flota con su propia estructura y su número de unidades, y con nombre y descripción propios. Por ejemplo, la flota Metro Línea 1 puede tener "Serie A", que usa Estructura 1 con 16 unidades, y "Serie B", que usa Estructura 2 con 8 unidades.

El alta inicial es un **asistente por pasos** (`stepper-horizontal`) que se abre desde el listado de flotas (HU-01).
- Los pasos **obligatorios** son Estructura, Unidades, Drivers y Carga de datos.
- Los pasos **opcionales** (Propiedades de categoría, Propiedades de hueco y SMS) se pueden **saltar** y completar más tarde.
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

      P3[3 · Drivers · obligatorio<br/>perfil Estándar elegido de inicio · km por defecto · ciclos y horas · herencia · HU-10..13]
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
1. **Flota y configuración:** la flota es el paraguas, solo con nombre y descripción (sin código; el nombre no se puede repetir). Cada configuración es una parte de la flota con su estructura y tiene también nombre y descripción.
2. **Unidades:** en el paso 2 solo se indica cuántas. Los nº de serie y el resto de datos de la unidad (fecha, km) llegan en la **plantilla de primer nivel**.
3. **Finalizar:** se puede finalizar en cuanto está cargada la plantilla de **primer nivel (unidades)**. El resto de plantillas se puede completar después.
4. **Cambios de estructura:** solo en los **extremos** (eliminar o cambiar extremos). La construcción completa con arrastrar y soltar solo es posible mientras se crea la estructura en el paso 1.
5. **Orden de los pasos opcionales:** drivers → propiedades de categoría → propiedades de hueco → SMS.

6. **Estructuras comunes** (2026-11-03): las estructuras forman un catálogo del cliente, en el apartado **Configuración › Estructuras**. En el paso 1 del asistente solo se **elige** una existente o se **crea** una nueva, que pasa al catálogo. Una estructura en uso se modifica desde el catálogo, con aviso de impacto, y el cambio afecta a todas las configuraciones que la usan.
7. **Propiedades y SMS de la flota:** los pasos 4, 5 y 6 guardan los datos en la **flota** y avisan de que se comparten con todas sus configuraciones.

8. **Drivers comunes** (2026-11-03): los drivers se agrupan en **perfiles** del catálogo del cliente, en el apartado **Configuración › Drivers**, ligados a una estructura. En el paso 3 se elige un perfil de la estructura o se crea uno nuevo, que pasa al catálogo. Un perfil en uso se modifica desde el catálogo, con aviso de impacto.

9. **Drivers por categoría y propiedades comunes** (2026-11-03): los drivers se marcan por **categoría**. Las propiedades de categoría y de hueco pasan a **perfiles de propiedades** del catálogo del cliente (**Configuración › Propiedades**), ligados a una estructura. En el paso 4 se elige, se crea o se duplica el perfil, y los pasos 4 y 5 lo editan, avisando si lo usan otras configuraciones. La flota se queda solo con el SMS. **Opción B decidida (2026-11-04).**

10. **Misma regla para drivers y propiedades en el asistente** (2026-11-04): en los pasos 3, 4 y 5 se **elige** un perfil existente o se **crea** uno nuevo. Si el perfil lo usan **otras configuraciones**, en el asistente se ve en **solo lectura**: para cambiarlo para todas se va a su apartado (con aviso de impacto) o se **duplica** para esta configuración. Si **solo lo usa esta configuración**, se edita en el mismo asistente.

11. **Propiedades de categoría y de hueco separadas** (2026-11-04): son dos catálogos con su propio apartado lateral (**Propiedades de categoría** y **Propiedades de hueco**). El paso 4 elige o crea un perfil de propiedades de categoría y el paso 5, uno de propiedades de hueco, de forma independiente y con la misma regla que los drivers.

12. **Perfiles por defecto** (2026-11-04): cada estructura tiene un perfil «Estándar» de drivers, de propiedades de categoría y de propiedades de hueco, que se crea solo con la estructura. Aparece el primero y marcado como *Por defecto*. No se puede eliminar.

13. **Perfil existente en solo lectura; drivers obligatorio** (2026-11-04): en el asistente, un perfil existente (de drivers o de propiedades) **nunca se marca ni desmarca**: se ve en solo lectura y, para cambiarlo, se modifica en su apartado o se duplica. Solo se marca al **crear un perfil nuevo**. El paso **Drivers es obligatorio** y empieza con el perfil Estándar elegido. Los pasos de **propiedades de categoría y de hueco son opcionales**: la configuración puede quedarse **sin perfil** (opción *Sin propiedades*), y no hay nada elegido de inicio. Sustituye a la parte de la decisión 10 que permitía editar en el asistente un perfil que solo usaba esa configuración.

## En prueba (rama prueba/estructura-y-unidades)
- **Datos básicos en la flota** (2026-11-04): al crear la flota (**Nueva flota**) o al iniciar una flota sin configuraciones se piden sus datos básicos:
  - Nombre y descripción de la flota (solo al crearla).
  - **¿Cuántas estructuras tiene?** *Una* o *Varias*.
  - **Una:** estructura y nº de unidades. La configuración se llama como la flota.
  - **Varias:** cuántas (2 a 10) y, por cada una, **nombre** (obligatorio y sin repetir), **estructura** y **nº de unidades**.
  - Al crear, se crean la flota y todas sus configuraciones (En configuración) y se sigue por la primera en el paso **Drivers**. Si falta una estructura, hay que crearla antes en Configuración › Estructuras.
- **Pasos 1 y 2 juntos:** el asistente tiene un solo paso **Estructura y unidades**. Sirve para añadir una configuración a una flota que ya tiene otras (nombre, descripción, nº de unidades y estructura, que se puede crear aquí) y para revisar las ya creadas.

## Decisiones de Claude (siguen como propuesta)
1. **Punto de guardado:** la configuración se crea, en estado En configuración, al completar el paso **Unidades**. Si sales antes, no se guarda nada y se avisa con un dialog.
2. **Pasos opcionales** con el botón "Omitir paso". En el stepper se marcan como *pendiente* y no como *hecho*.
3. **Navegación libre** hacia atrás por el stepper. Hacia delante, solo cuando los obligatorios están completos.
4. **SMS** solo aparece si el cliente lo tiene contratado.
