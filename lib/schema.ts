import { z } from "zod";

/**
 * Modelo de datos de una prenda. Es la "tabla" del ropero:
 * si una fila de data/prendas.json no cumple esto, el build falla
 * y te dice qué prenda y qué campo están mal.
 */

// Todas las categorías futuras ya existen; hoy solo se muestran remeras.
export const CATEGORIAS = [
  "remera",
  "camisa",
  "buzo",
  "campera",
  "pantalon",
  "short",
  "gorra",
  "zapatillas",
  "accesorio",
] as const;

export const CategoriaSchema = z.enum(CATEGORIAS);

const Hex = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Tiene que ser un color hex tipo #1a2b3c");

const RutaFoto = z
  .string()
  .regex(/^\/prendas\/.+\.(webp|png|jpg)$/, "Tiene que ser una ruta tipo /prendas/<id>/frente.webp");

// null o "" cuentan como "sin completar"
const TextoOpcional = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

export const PrendaSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (ej. remera-negra-ac-dc)"),
  nombre: z.string().min(1, "El nombre no puede estar vacío"),
  categoria: CategoriaSchema,
  fotos: z.object({
    frente: RutaFoto,
    espalda: RutaFoto.nullish().transform((v) => v ?? null),
  }),
  colores: z.array(Hex).default([]),
  marca: TextoOpcional,
  banda_o_tema: TextoOpcional,
  anio: z.number().int().min(1900).max(2100).nullish().transform((v) => v ?? null),
  anecdota: TextoOpcional,
  tags: z
    .array(z.string().min(1))
    .default([])
    .transform((tags) => tags.map((t) => t.trim().toLowerCase())),
  /** Fecha en que se cargó (la pone el script). Sirve para ordenar. */
  agregada: z.iso.date().nullish().transform((v) => v ?? null),
});

export const ListaPrendasSchema = z.array(PrendaSchema).superRefine((lista, ctx) => {
  const vistos = new Set<string>();
  lista.forEach((p, i) => {
    if (vistos.has(p.id)) {
      ctx.addIssue({ code: "custom", path: [i, "id"], message: `id repetido: "${p.id}"` });
    }
    vistos.add(p.id);
  });
});

export type Categoria = z.infer<typeof CategoriaSchema>;
/** Prenda ya validada y normalizada (lo que usa la web). */
export type Prenda = z.output<typeof PrendaSchema>;
/** Prenda tal como se escribe en el JSON. */
export type PrendaEntrada = z.input<typeof PrendaSchema>;
