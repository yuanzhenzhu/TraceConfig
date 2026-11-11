# Proyecto: prototipos de Leadmind Trace con el sistema de diseño Leadmind

Prototipos navegables de toda la aplicación **Leadmind Trace**, construidos a partir de historias de usuario y flujos, sin diseñador, usando **solo** el sistema de diseño Leadmind (basado en Material 3 y Angular Material, en español).

Es **una sola app** con cuatro módulos, cada uno en su ruta, que comparten sistema de diseño, navegación y datos:

| Módulo | Ruta | Documentación (local) |
|---|---|---|
| Configuración | `app/configuracion/` | `documentos/configuracion/` |
| Consulta | `app/consulta/` | `documentos/consulta/` |
| Movimientos | `app/movimientos/` | `documentos/movimientos/` |
| Registros | `app/registros/` | `documentos/registros/` |

## Antes de prototipar, lee siempre
- `documentos/contexto/producto.md`: qué es la aplicación, sus usuarios, módulos, glosario y formatos. Úsalo para los textos y la lógica. Es común a todos los módulos.
- `documentos/<módulo>/`: historias y flujos **solo del módulo** en el que se trabaja.
- `design-system/design-system.md`: componentes, cuándo usar cada uno, patrones de pantalla y reglas del equipo.
- `design-system/tokens.css`: tokens en CSS. Impórtalo en cada prototipo.
- `datos/datos.xlsx`: datos que comparten todos los módulos (ver "Datos"). Si hay datos para la historia, úsalos tal cual. Si no hay, invéntalos coherentes con `producto.md` y avisa de que son ficticios.

Librerías de Figma, que son la fuente de verdad. Si hay dudas, consúltalas con las herramientas de Figma:
- Foundations: `M48RxxqGH7oNXYCO5iO45q`
- Components: `DNCe3G7Qt44fZcPQmrGjXu`
- Compositions: `ntCxirKsqU6JlSrwIXMMHc` (la página "Galería de ejemplos" `4331:20151` tiene pantallas reales de referencia)
- Icons: `ACKZ2fSENuI6jOtBSuTzLB`

## Documentación: solo en local
`documentos/` (contexto, historias, flujos, Word) está en `.gitignore` y **nunca se sube a GitHub**. Organización:
```
documentos/
  contexto/producto.md          común: glosario, nomenclatura, módulos
  <módulo>/historias/           HU-XX-nombre.md
  <módulo>/flujos/
```

## Datos
- La fuente es **`datos/datos.xlsx`**; la primera hoja explica cada una. `npm run datos` lo convierte a `datos/datos.json`, que es lo que lee la app. `npm run dev` lo convierte al arrancar y cada vez que se guarda el Excel; `npm run build` también.
- Si el Excel tiene errores, la terminal indica hoja y fila y se conserva el JSON anterior.
- Lo que el usuario cambia en el prototipo se guarda en su navegador (localStorage) y se puede restablecer a los datos del Excel.

## Flujo de trabajo
1. **Historia**: cada historia de usuario va en `documentos/<módulo>/historias/HU-XX-nombre.md`, con su rol, objetivo, beneficio y criterios de aceptación. Si falta algo (estados de error, permisos, casos vacíos), pregunta antes de diseñar.
2. **Flujo**: dibuja el flujo (pantallas, decisiones, errores y estados vacíos) en `documentos/<módulo>/flujos/` y pide validación **antes** de construir pantallas.
3. **Prototipo**: construye en la app **Next.js** (App Router, TypeScript) de la raíz del repo, pensada para publicarse en Vercel. Cada módulo en su ruta (`app/<módulo>/...`). Los componentes del sistema están en `components/ds.tsx` y sus estilos en `app/globals.css`, siempre con los tokens de `design-system/tokens.css`. Tiene que poder recorrerse con clics de principio a fin. Arranque: `npm run dev`; antes de dar algo por bueno, `npm run build`.
4. **Revisión**: comprueba cada criterio de aceptación y cada estado (vacío, cargando, error, éxito) antes de darlo por terminado.

## Trabajo con varios módulos
- Una rama por módulo o por historia (`consulta/...`, `configuracion/...`); se juntan en `main` cuando están validadas.
- Lo común (`components/ds.tsx`, `app/globals.css`, `lib/` compartido, `datos/`, `producto.md`, la navbar) afecta a **todos** los módulos: cámbialo en una sola sesión a la vez y, antes de subir, revisa también las pantallas principales de los demás módulos.

## Reglas de diseño (obligatorias)
- **Solo tokens**: no inventes colores, tamaños, radios ni sombras. Usa los `var(--lm-*)` de `tokens.css` y los roles `sys` o semánticos, nunca la paleta `ref`.
- **Solo componentes del sistema**: si una necesidad no encaja en ningún componente o composición, dilo y propón el más cercano. No crees componentes nuevos sin avisar.
- **Una sola acción principal** (`matButton-filled`) por vista o dialog. Las secundarias van con outlined y las terciarias con text.
- **Iconos**: solo los de la lista de `design-system.md` §7, en Material Symbols Outlined a 24 px.
- **Tipografía**: Roboto con las clases `.lm-*`. El texto por defecto es `body/medium` (14/20).
- **Estructura de página**: `navbar` → `header` (breadcrumb, título y acciones) → `matTabs` si hace falta → filtros → contenido → `matPaginator`. Escritorio a 1440 px.
- **Nomenclatura**: usa solo los términos de la tabla "Nomenclatura acordada" de `producto.md`. Si una historia, un dato o una referencia de Figma trae un término anterior, sustitúyelo y avisa.
- **Textos**: siempre en español y con datos realistas del dominio (flotas, grupos de trenes, unidades con nº de serie de 4 dígitos como 1001, estructuras, activos, almacenes), nunca lorem ipsum. Snackbar sin punto final.
- **Estados**: cada pantalla con datos tiene que mostrar los estados vacío (`empty-state`), cargando (`matProgressSpinner`) y error (`banner` o error de campo).
- **Accesibilidad**: contraste AA, foco visible (capa de estado al 10%), labels en todos los campos y `aria-label` en los botones que solo tienen icono.

## Convenciones
- Nombres de archivo en minúsculas con guiones (`HU-01-alta-alarma`). No mezcles `-` y `_`.
- Antes de cambios grandes en un prototipo, guarda la versión con Git.
