import type { Metadata } from "next";
import "../design-system/tokens.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Leadmind Trace · Prototipo de configuración",
  description: "Prototipo navegable del alta inicial de configuraciones (épica A)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Las @import de tokens.css no sobreviven al empaquetado de Next.js, así que las fuentes se cargan aquí */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
