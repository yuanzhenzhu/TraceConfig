# Leadmind: sistema de diseño

Referencia para prototipar. Se extrajo de las 4 librerías de Figma el 2026-11-03. Los valores en código están en [tokens.css](tokens.css).

Leadmind se basa en **Material Design 3**. Los componentes siguen la nomenclatura de **Angular Material** (`matButton`, `matFormField`…). Su tipografía es **Roboto** y su idioma de interfaz es **español**.

## Librerías de Figma

| Librería | Contenido | Enlace |
|---|---|---|
| Foundations | Color, layout, radios, elevación, tipografía, tamaños, espaciado | [Figma](https://www.figma.com/design/M48RxxqGH7oNXYCO5iO45q/Foundations) |
| Components | Componentes base (`mat*`) | [Figma](https://www.figma.com/design/DNCe3G7Qt44fZcPQmrGjXu/Components) |
| Compositions | Patrones de pantalla: header, navbar, dialog, filtros, celdas de tabla… | [Figma](https://www.figma.com/design/ntCxirKsqU6JlSrwIXMMHc/Compositions) |
| Icons | 88 iconos de Material + `icon-container` | [Figma](https://www.figma.com/design/ACKZ2fSENuI6jOtBSuTzLB/Icons) |

En Compositions, la página **Galería de ejemplos** (`4331:20151`) tiene pantallas reales: configuración de alarmas, gestión de unidades, planificador y estimación de kilometraje. Son la mejor referencia de cómo se combinan las piezas.

---

## 1. Color

Usa los **roles**, nunca la paleta base (`ref`). Cada fondo va con su color "on-" para el texto y los iconos que tiene encima.

### Roles principales

| Rol | Hex | Uso |
|---|---|---|
| `primary` | `#2b1c74` | Acción principal (botón filled), elementos activos, enlaces |
| `on-primary` | `#ffffff` | Texto o icono sobre `primary` |
| `primary-container` | `#b7adeb` | Fondo destacado suave, elemento seleccionado |
| `on-primary-container` | `#201556` | Texto sobre `primary-container` |
| `secondary` | `#1e1452` | Acento secundario, navbar |
| `secondary-container` | `#dfdaf6` | Botón tonal, chip seleccionado |
| `on-secondary-container` | `#170f3e` | Texto sobre `secondary-container` |
| `error` | `#dc0d04` | Errores de validación, acción destructiva |
| `error-container` / `on-error-container` | `#fecac8` / `#a50a03` | Fondo y texto de error suave |

### Superficies y neutros

| Rol | Hex | Uso |
|---|---|---|
| `background` | `#ffffff` | Fondo de la aplicación |
| `surface` | `#f9f9fb` | Fondo de página o sección |
| `surface-container-lowest` | `#ffffff` | Cards y paneles sobre `surface` |
| `surface-container-low` | `#f9f9fb` | |
| `surface-container` | `#f0f0f4` | Áreas agrupadas, cabecera de tabla |
| `surface-container-high` | `#eeeef2` | |
| `surface-container-highest` | `#e4e2e8` | Campos *filled* |
| `on-surface` | `#18171c` | Texto principal |
| `on-surface-variant` | `#474554` | Texto secundario, labels, iconos |
| `outline` | `#77728d` | Bordes de inputs y botones outlined |
| `outline-variant` | `#c8c7d1` | Divisores, bordes de cards |
| `inverse-surface` / `inverse-on-surface` | `#2f2e38` / `#f1f1f4` | Snackbar, tooltip |
| `section-background` | `#f5f5f5` | Fondo de sección (add-on) |

### Semánticos (estados y feedback)

Cada semántico tiene 5 tokens: color base, `on-`, `container`, `container-variant` y `on-…-container`.

| Semántico | Base | Container | On-container | Uso |
|---|---|---|---|---|
| `danger` | `#dc0d04` | `#fee2e1` | `#320301` | Error, fallo, parado |
| `success` | `#1faf59` | `#e9f9ef` | `#0e5129` | Correcto, completado, aplicado |
| `warning` | `#d68d00` | `#fdf5e6` | `#634100` | Aviso, riesgo |
| `attention` | `#d9c125` | `#fdfaea` | `#645911` | Requiere atención, pendiente |
| `info` | `#1c6ca4` | `#e9f1f8` | `#0d324c` | Información neutra |

### Capas de estado (interacción)

Sobre el color "on-" del componente se aplica una capa con esta opacidad:
- **Hover**: 8%
- **Focus**: 10%
- **Pressed / drag**: 16%
- **Disabled**: contenido `on-surface` al 38% y contenedor `on-surface` al 12%

### Categóricos (gráficas y etiquetas de categoría)

- `pale-1` a `pale-5`: fondos suaves de categorías (amarillo, azul, verde, lila, gris), cada uno con variantes `light`, `hover` y `drag`.
- `vibrant-1` a `vibrant-40`: series de gráficas. Usa los primeros por orden.

### Overlay

- `overlay` `rgba(38,38,41,.8)`
- `overlay-light` `rgba(0,0,0,.32)`: fondo detrás de un dialog

---

## 2. Tipografía

Toda la tipografía es **Roboto**. Cada estilo tiene además una variante `-emphasized` (un peso más) y otra `-italic`.

| Estilo | Tamaño / interlineado | Peso | Tracking | Uso típico |
|---|---|---|---|---|
| display/large | 56/64 | 400 | -0.25 | Cifras grandes de dashboard |
| display/medium | 48/52 | 400 | 0 | |
| display/small | 36/44 | 400 | 0 | |
| headline/large | 32/40 | 400 | 0 | |
| headline/medium | 28/36 | 400 | 0 | |
| headline/small | 24/32 | 400 | 0 | Título de página |
| title/large | 22/28 | 400 | 0 | Título de dialog o sección |
| title/medium | 16/24 | 500 | 0.15 | Título de card o panel |
| title/small | 14/20 | 500 | 0.1 | Subtítulo, cabecera de tabla |
| label/large | 14/20 | 500 | 0.1 | Botones, tabs |
| label/medium | 12/16 | 500 | 0.5 | Labels de chip o tag, cabecera de columna en mayúsculas |
| label/small | 10/16 | 500 | 0.5 | Badges |
| body/large | 16/24 | 400 | 0.5 | Texto largo |
| body/medium | 14/20 | 400 | 0.25 | **Texto por defecto**: celdas, inputs, párrafos |
| body/small | 12/16 | 400 | 0.4 | Supporting text, ayudas |

---

## 3. Espaciado, radios, elevación y tamaños

**Espaciado**, en una escala de 4 px:
`space-5` 4 · `space-10` 8 · `space-15` 12 · `space-20` 16 · `space-30` 24 · `space-40` 32 · `space-50` 40 · `space-55` 48 · `space-60` 56 · `space-70` 64 · `space-80` 72 · `space-90` 80 · `space-95` 88 · `space-100` 96

**Radios** (`shape/corner-*`):
`corner-20` 4 (revisiones, tolerancias, tags) · `corner-30` 8 (cards, surface) · `corner-40` 12 · `corner-50` 16 · `corner-60` 20 · `corner-70` 28 (dialogs) · `corner-80` 32 · `corner-90` 48 · `corner-100` 100 (pill: botones, chips)

**Elevación**: de `elevation-1` a `elevation-5`. Los valores CSS están en `tokens.css`.
- Card elevated: 1
- Menu o select abierto: 2
- Snackbar o FAB: 3
- Dialog: 3

**Iconos**: S 12 · M 18 · **L 24 (por defecto)** · XL 48 · 2XL 60

**Tamaños de componente**:
- Dialog: S 568 px, L 864 px. Una tabla dentro de un dialog L mide 320 px de alto.
- Chart tooltip: entre 120 y 232 px.

---

## 4. Layout y breakpoints

| Breakpoint | Ancho | Columnas | Gutter | Margen |
|---|---|---|---|---|
| XS | 0–599 | 4 | 16 | 16 |
| S | 600–839 | 8 | 16 | 32 |
| M | 840–1199 | 12 | 24 | 24 |
| L | 1200–1599 | 12 | 24 | 200 |
| XL | 1600+ | 12 × 104 (centrado) | 16 | — |
| XL inner | 1360 | 12 | 16 | 24 |

Son aplicaciones de escritorio (B2B). Prototipa a **1440 px** salvo que la historia diga otra cosa.

---

## 5. Componentes (librería Components)

Las propiedades son las que expone cada componente en Figma. En código, imita su aspecto de Material 3 con los tokens de arriba.

### Acciones
| Componente | Variantes / propiedades | Cuándo usarlo |
|---|---|---|
| `matButton-filled` | Size: Small/Regular · icono opcional · estados | **Una** acción principal por vista o dialog (Guardar, Aplicar, Emitir) |
| `matButton-outlined` | Small/Medium · icono opcional | Acción secundaria (Cancelar, Restablecer) |
| `matButton-text` | Small/Regular | Acción terciaria o de bajo peso |
| `matButton-tonal` | Small/Medium | Acción secundaria destacada |
| `matButtonIcon` | compact/default · icono | Acciones en fila de tabla, cerrar, más opciones (`more_vert`) |
| `matFAB` | mini | Acción flotante |
| `matButtonToggle-group` | 2–5 segmentos · Density 0 a -3 · label, icono o ambos | Cambiar de vista (Resumen / Gráfica / Lista, Mensual / Anual) |

### Formularios
| Componente | Variantes / propiedades | Cuándo usarlo |
|---|---|---|
| `matFormField` | Estados Enabled/Hovered/Focused/Error/Disabled · icono inicial y final · supporting text | Inputs de texto (outlined) |
| `matSelect` | Default/Select/With Data/Disabled/Error · supporting text | Desplegable de opciones ("Selecciona una opción") |
| `matDatepicker` | Default/hovered/error/focused · supporting text | Fecha o rango de fechas |
| `matCalendar` | Day/Month/Year · botón Clear | Panel de calendario |
| `matTimepicker` | — | Hora |
| `matCheckbox` | label opcional · disabled | Selección múltiple |
| `matRadioButton` | label + supporting text · disabled | Selección única entre 2 y 5 opciones |
| `matSlideToggle` | label before/after | Activar o desactivar al momento |
| `uploader` | hasta 6 archivos · formatos admitidos · Default/Disabled | Subir archivos |

### Navegación y estructura
| Componente | Variantes | Cuándo usarlo |
|---|---|---|
| `breadcrumb` | Nivel 1, 2 o 3 | Ruta dentro del header |
| `matTabs` | Fixed/Scrollable · Secondary · label e icono | Secciones dentro de una página (General / Capacidad / Costes…) |
| `matPaginator` | first/middle/last · items por página | Debajo de las tablas ("Items per page", "1 - 5 of 20") |
| `matExpansionPanel` (+ group) | start/middle/end · expanded · icono y subtítulo | Contenido plegable |
| `matDivider-horizontal` / `-vertical` | Full-width/Inset/Middle-inset/con subhead | Separadores |
| `scrollbar` | thumb 25–100% · flechas | Scroll personalizado |
| `surface` | padding 0/16/24 · corner-8 · slot | Contenedor blanco genérico |

### Contenido
| Componente | Variantes | Cuándo usarlo |
|---|---|---|
| `matCard` | Outlined/Elevated/Filled · vertical u horizontal · header, imagen, acciones | Agrupar contenido o resumen |
| `matList` / `matList-item` | 1, 2 o 3+ líneas · leading (icono, avatar, check, radio, switch) · trailing | Listas |
| `matAvatar` | Check/Monogram/Avatar · Small/Regular/Big | Usuario |
| `matChip` (+ group) | Selected · iconos · single row o multi-row | Filtros activos, selección |
| `matMenu` | Density 0/-2/-4 · icono · supporting text · divisor | Menús contextuales y desplegables |
| `matTooltip` | Una línea / multilínea | Ayuda al pasar el cursor |

### Estado y feedback
| Componente | Variantes | Cuándo usarlo |
|---|---|---|
| `tagSemantic-status` | Attention/Error/Success/Info/Warning/Neutral · número opcional | **Estado** de un elemento (En curso, Aplicada, Error) |
| `tagSemantic-category` | Link/Primary/Secondary/Terciary/Disabled/Ghost | Categoría o tipo |
| `tagSemantic-boolean` | On/Off/Problem | Estado binario |
| `matBadge` | Medium/Small | Contador sobre icono |
| `banner` | Info/Success/Error/Attention · Big/Small · título, texto y acción | Mensaje persistente dentro de la página |
| `floating-banner` | Info/Success/Error/Attention · spinner · botón · cerrar | Aviso flotante (proceso en curso, resultado) |
| `MatSnackBar` | Solo texto / con acción · 1 o 2 líneas · cerrar | Confirmación breve tras una acción. **Sin punto final en el texto.** |
| `matProgressSpinner` | Big/Regular/Small/XS · Default/Inverse | Carga |

> `banner-deprecated` está obsoleto: no lo uses.

---

## 6. Composiciones (librería Compositions)

| Composición | Propiedades | Uso |
|---|---|---|
| `navbar` | logo de producto o cliente · idioma · ajustes · menú de usuario | Barra superior global (fondo `secondary`) |
| `navlist` | 2–6 ítems | Navegación lateral o de secciones |
| `header` | 1 o 2 títulos · breadcrumb · hasta 3 botones (primario, secundario, terciario) | Cabecera de cada página |
| `section-title-module` | label y descripción | Título de bloque dentro de una página |
| `dialog-2` | Default/Small · título, mensaje, etiqueta · footer con botones filled, outlined y text · slot | Modales (confirmación, formularios cortos). Footer: Cancelar (outlined) + acción (filled) |
| `empty-state` | — | Tabla o lista sin datos; búsqueda sin resultados (`search_off`) |
| Filters | (documentación, no es componente) | Fila de filtros encima de la tabla: selects (Organización, Departamento, Ubicación, Proyecto…) + Aplicar / Restablecer. Padding 0 |
| `matCell / …` | celdas de tabla: index col (title/empty/checkbox), text, action, semantic, label, row | Construir tablas de datos |
| Paginator area | (documentación) | Pie de tabla con `matPaginator` |
| `stepper-horizontal` | — | Procesos en pasos |
| `configuration-detail-card` | (popover) | Detalle emergente de una configuración |
| `Chart tooltip` | — | Tooltip de gráficas |

### Patrón de pantalla típico (según la Galería de ejemplos)

```
navbar
└─ header (breadcrumb + título + acciones)
   └─ matTabs (si hay secciones)
      └─ Filters (selects + Aplicar/Restablecer)
         └─ tabla (matCell…) o cards
            └─ matPaginator
```

Las tablas son el patrón central. Las cabeceras de columna van en **MAYÚSCULAS** (`label/medium`) y las celdas en `body/medium`. En cada fila hay acciones con `matButtonIcon` (`edit`, `delete`, `more_vert`).

---

## 7. Iconos

Son iconos de **Material Symbols (Outlined)**, a 24 px por defecto, dentro de `icon-container` con tamaños S, M, L, XL y 2XL. Los iconos con sufijo `_filled` son la versión rellena: se usan, por ejemplo, para el ítem activo del navlist.

Iconos disponibles en la librería (no uses otros sin consultarlo):

`account_circle(_filled)` `add` `adjust` `arrow_back_ios_new` `arrow_drop_down` `arrow_drop_up` `arrow_forward_ios` `arrow_left` `arrow_right` `attach_file` `block` `cancel` `change_history` `check` `check_circle` `chevron_left` `chevron_right` `circle(_filled)` `close` `content_copy` `contrast` `crop_16_9` `crop_din` `crop_portrait` `delete` `domain` `download_done` `drive_file_rename_outline` `edit` `emergency` `engineering` `error_outline` `expand_less` `expand_more` `file_download` `file_upload` `filter_tilt_shift` `find_in_page` `first_page` `functions` `help` `hexagon` `info` `last_page` `link` `list` `lock` `more_vert` `motion_photos_on` `no_saved`* `north_east` `notifications` `pentagon` `person_add` `person_off` `pie_chart` `placeholder` `priority_high` `published_with_changes` `radio_button_checked` `remove` `restart_alt` `ruler` `search` `search_off` `settings(_filled)` `share` `show_chart` `speaker_phone` `swap_vert` `sync` `table_chart` `table_rows` `timelapse` `today` `toggle_off` `toggle_on` `tonality` `train` `visibility` `visibility_off` `warning` `wc` `work(_filled)`

\* `no_saved` es un icono propio y no existe en Material Symbols. En código, sustitúyelo por `cloud_off` o por el SVG exportado de Figma.

La página Illustration está vacía.

---

## 8. Reglas y decisiones del equipo (de la página Documentación)

- **Contenido de interfaz en español.** Para cambios se usa el verbo **"Modificar"** (en gestión de unidades) y **"Editar"** según el contexto. Revisa la coherencia en cada flujo.
- Snackbar: **sin punto final**.
- Revisiones y tolerancias usan un radio de **4 px** (`corner-20`).
- Unidad **parada**: fondo con la capa de estado `on-error-container` al 8%.
- Cargas en pestañas de configuración: muestra un `matProgressSpinner`.
- Los mensajes de error van **siempre en español**.
- Dialog: los slots no son componentes, solo frames. El overlay no forma parte del componente.
- Los filtros, estén en el contenido o en la sección de filtros, tienen **padding 0** (patrón `APP-FILTERS`).
- Los nombres no deben referirse al producto: es una variante, no "Navbar SMS".
- No mezcles `-` y `_` en un mismo nombre.
