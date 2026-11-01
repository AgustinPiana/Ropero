import Image from "next/image";
import Link from "next/link";
import type { Prenda } from "@/lib/schema";
import { urlPrenda } from "@/lib/rutas";

/**
 * Grilla 2D de prendas. Es la vista para dispositivos sin WebGL
 * (y la que se ve mientras no existe el perchero 3D).
 */
export function GrillaPrendas({ prendas }: { prendas: Prenda[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {prendas.map((p) => (
        <li key={p.id}>
          <Link
            href={urlPrenda(p)}
            className="group flex flex-col gap-3 rounded-2xl p-3 transition-colors hover:bg-superficie"
          >
            <div className="relative aspect-[8/9]">
              <Image
                src={p.fotos.frente}
                alt={`${p.nombre}, vista de frente`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:-translate-y-1"
              />
            </div>
            <span className="text-center text-sm text-texto-suave group-hover:text-texto">{p.nombre}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
