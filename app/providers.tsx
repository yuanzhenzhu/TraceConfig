"use client";

import { Navbar, SnackbarProvider } from "@/components/ds";
import { MovimientosProvider } from "@/lib/movimientos";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <MovimientosProvider>
        <SnackbarProvider>
          <Navbar />
          {children}
        </SnackbarProvider>
      </MovimientosProvider>
    </StoreProvider>
  );
}
