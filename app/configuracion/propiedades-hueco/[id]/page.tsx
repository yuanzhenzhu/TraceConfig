"use client";

import { useParams } from "next/navigation";
import { EditorPerfilProps } from "@/components/catalogo-propiedades";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <EditorPerfilProps tipo="hueco" id={id} />;
}
