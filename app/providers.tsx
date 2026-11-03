"use client";

import { Navbar, SnackbarProvider } from "@/components/ds";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SnackbarProvider>
        <Navbar />
        {children}
      </SnackbarProvider>
    </StoreProvider>
  );
}
