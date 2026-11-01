import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PanelPrenda } from "@/components/ficha/PanelPrenda";
import { getPrenda, getPrendas } from "@/lib/prendas";

// Una página estática por prenda, generada en el build: /remera/<id>.
// Cualquier otra URL da 404 (no se genera nada en el momento).
export const dynamicParams = false;

export function generateStaticParams() {
  return getPrendas().map((p) => ({ categoria: p.categoria, id: p.id }));
}

export async function generateMetadata(props: PageProps<"/[categoria]/[id]">): Promise<Metadata> {
  const { categoria, id } = await props.params;
  const prenda = getPrenda(categoria, id);
  return { title: prenda?.nombre ?? "No encontrada" };
}

/** La ficha de una remera, encima del perchero (que la acerca a cámara). */
export default async function PaginaPrenda(props: PageProps<"/[categoria]/[id]">) {
  const { categoria, id } = await props.params;
  const prenda = getPrenda(categoria, id);
  if (!prenda) notFound();
  return <PanelPrenda prenda={prenda} />;
}
