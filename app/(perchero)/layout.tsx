import { Perchero } from "@/components/perchero/Perchero";
import { getPrendas } from "@/lib/prendas";

/**
 * El perchero vive acá (y no en cada página) para que no se desmonte
 * al abrir una remera: solo cambia el panel de la ficha (children).
 */
export default function LayoutPerchero({ children }: LayoutProps<"/">) {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <Perchero prendas={getPrendas("remera")} />
      {children}
    </main>
  );
}
