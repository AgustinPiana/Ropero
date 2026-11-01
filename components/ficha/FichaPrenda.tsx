import type { Prenda } from "@/lib/schema";

/**
 * Ficha con los datos de una prenda. Es solo presentación:
 * la usan la página /remera/[id] y el panel del perchero.
 */
export function FichaPrenda({ prenda, idTitulo }: { prenda: Prenda; idTitulo?: string }) {
  const filas: [string, string | number | null][] = [
    ["Banda / tema", prenda.banda_o_tema],
    ["Marca", prenda.marca],
  ];
  const completas = filas.filter(([, v]) => v !== null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.25em] text-laton">{prenda.categoria}</p>
          {prenda.anio && (
            <p className="font-display text-2xl tabular-nums text-laton" aria-label={`Año ${prenda.anio}`}>
              {prenda.anio}
            </p>
          )}
        </div>
        <h2 id={idTitulo} className="font-display text-3xl leading-tight text-balance sm:text-4xl">
          {prenda.nombre}
        </h2>
      </header>

      {prenda.colores.length > 0 && (
        <ul className="flex gap-2" aria-label="Colores">
          {prenda.colores.map((c) => (
            <li
              key={c}
              title={c}
              className="size-7 rounded-full ring-1 ring-white/15"
              style={{ backgroundColor: c }}
            >
              <span className="sr-only">{c}</span>
            </li>
          ))}
        </ul>
      )}

      {completas.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          {completas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="contents">
              <dt className="text-texto-suave">{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {prenda.anecdota && (
        <blockquote className="border-l border-laton/60 pl-4 font-display text-lg italic leading-relaxed text-texto/90">
          {prenda.anecdota}
        </blockquote>
      )}

      {prenda.tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
          {prenda.tags.map((t) => (
            <li key={t} className="rounded-full border border-borde px-3 py-1 text-xs text-texto-suave">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
