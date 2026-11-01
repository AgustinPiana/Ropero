import type { Prenda } from "./schema";

/** URL pública de una prenda: /remera/mi-remera (mañana /pantalon/...). */
export const urlPrenda = (p: Pick<Prenda, "categoria" | "id">) => `/${p.categoria}/${p.id}`;
