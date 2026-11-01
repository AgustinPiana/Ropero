import datos from "@/data/prendas.json";
import { z } from "zod";
import { ListaPrendasSchema, type Categoria, type Prenda } from "./schema";

/**
 * Lee data/prendas.json y lo valida una sola vez.
 * Solo se usa del lado servidor (en el build); a los componentes
 * del navegador les llegan las prendas ya validadas como props.
 */
function cargar(): Prenda[] {
  const resultado = ListaPrendasSchema.safeParse(datos);
  if (!resultado.success) {
    throw new Error(
      `data/prendas.json tiene errores:\n${z.prettifyError(resultado.error)}`,
    );
  }
  return resultado.data;
}

const prendas = cargar();

export function getPrendas(categoria?: Categoria): Prenda[] {
  return categoria ? prendas.filter((p) => p.categoria === categoria) : prendas;
}

export function getPrenda(categoria: string, id: string): Prenda | undefined {
  return prendas.find((p) => p.categoria === categoria && p.id === id);
}
