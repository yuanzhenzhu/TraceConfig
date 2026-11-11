# Leadmind Trace · Prototipos

Prototipo navegable de **Leadmind Trace** construido con el sistema de diseño Leadmind. Es una sola app con cuatro módulos que comparten diseño, navegación y datos:

| Módulo | Ruta | Estado |
|---|---|---|
| Configuración | `/configuracion` | Flotas y configuraciones (asistente de 8 pasos), estructuras, drivers, propiedades de categoría, cambio de nº de serie y almacenes |
| Consulta | `/consulta` | Pendiente |
| Movimientos | `/movimientos` | Pendiente |
| Registros | `/registros` | Por definir |

Todos los datos son **ficticios**.

## Arrancar en local
Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Editar los datos
Los datos comunes están en **`datos/datos.xlsx`**. La primera hoja ("Instrucciones") explica cada una.

- Con `npm run dev` en marcha, basta con guardar el Excel: la app se actualiza sola.
- Sin el servidor en marcha, `npm run datos` convierte el Excel a `datos/datos.json`, que es lo que lee la app. `npm run build` también lo hace.
- Si el Excel tiene algún error, la terminal indica la hoja y la fila, y la app sigue usando los datos anteriores.

Lo que se cambia dentro del prototipo se guarda en el navegador (localStorage) y se puede restablecer.

## Publicar en Vercel
En Vercel, **Add New › Project** e importa el repositorio. Detecta Next.js automáticamente.

## Estructura
| Carpeta | Contenido |
|---|---|
| `app/` | Una ruta por módulo y estilos de componentes (`globals.css`) |
| `components/` | Componentes del sistema (`ds.tsx`) y piezas de cada módulo |
| `lib/` | Modelo de dominio y estado |
| `datos/` | Excel de datos y su conversión a JSON |
| `scripts/` | Conversión del Excel y arranque en desarrollo |
| `design-system/` | Tokens y documentación del sistema Leadmind |

La documentación del producto (contexto, historias de usuario, flujos) está en `documentos/`, que solo existe en local y no se sube a GitHub.
