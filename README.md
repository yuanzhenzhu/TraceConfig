# Leadmind Trace · Prototipos

Prototipos navegables de **Leadmind Trace** construidos con el sistema de diseño Leadmind.

## Prototipo disponible
**Configuración · épica A, alta inicial**. Incluye:
- `/configuracion`: listado de flotas y configuraciones (HU-01).
- `/configuracion/[id]`: asistente de 8 pasos, de Datos y estructura a Resumen y finalizar.

Todos los datos son **ficticios** (`lib/model.ts`). Se guardan en el navegador (localStorage) y se pueden restablecer desde el pie del listado, donde también se pueden ver los estados de pantalla (cargando, vacío, error).

## Arrancar en local
Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Publicar en Vercel
1. Sube el repositorio a GitHub.
2. En Vercel, elige **Add New › Project** e importa el repositorio. Detecta Next.js automáticamente; no hace falta configurar nada.

## Estructura
| Carpeta | Contenido |
|---|---|
| `app/` | Rutas de Next.js y estilos de componentes (`globals.css`) |
| `components/` | Componentes del sistema (`ds.tsx`), editor de estructura (`arbol.tsx`) y pasos del asistente |
| `lib/` | Modelo de dominio, datos de ejemplo y estado |
| `design-system/` | Tokens y documentación del sistema Leadmind |
| `contexto/` · `historias/` · `flujos/` | Contexto de producto, historias de usuario y flujos validados |
