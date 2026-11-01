# Mi ropero virtual

Perchero 3D con mis remeras. Next.js + React Three Fiber, deploy en Vercel.

```bash
npm install
npm run dev        # http://localhost:3000
```

---

## 1. Cómo sacar las fotos

La web recorta la remera de la foto y usa su silueta para darle forma en 3D,
así que **cuanto más limpia la foto, mejor queda**.

- **Fondo liso y que contraste**: pared o sábana clara para remeras oscuras,
  sábana oscura para remeras claras. Sin dibujos ni otras cosas en cuadro.
- **Luz pareja**: de día, cerca de una ventana, sin sol directo. Sin flash
  (hace brillos y sombras duras).
- **Remera estirada y derecha**: apoyada en el piso o colgada, sin arrugas,
  mangas abiertas hacia los costados, el cuello arriba y la remera recta
  (no torcida: la web no la endereza).
- **Cámara de frente**, desde arriba y paralela a la remera (no en diagonal).
  Que la remera ocupe casi toda la foto, sin cortar mangas ni cuello.
- **Frente y espalda**: la espalda es opcional. Si no hay, atrás se usa el color dominante.
- **iPhone**: sacá en JPG (Ajustes › Cámara › Formatos › *Más compatible*). Las .HEIC no andan.

## 2. Cómo agregar una remera

1. Creá una carpeta por remera dentro de `fotos-crudas/` con un nombre corto
   (se convierte en su URL: `/remera/remera-negra-ac-dc`):

   ```
   fotos-crudas/
     remera-negra-ac-dc/
       frente.jpg
       espalda.jpg      ← opcional
   ```

2. Corré:

   ```bash
   npm run procesar
   ```

   Quita el fondo (con una IA que corre en tu compu, gratis; la primera vez
   instala lo necesario y tarda un poco más), recorta, achica a WebP, saca los
   colores dominantes y agrega la remera a `data/prendas.json`.
   Solo procesa lo nuevo o lo que cambió. Opciones:

   ```bash
   npm run procesar -- --todo                 # reprocesa todas
   npm run procesar -- remera-negra-ac-dc     # solo esa
   npm run procesar -- --con-fondo            # si ya tenés PNG sin fondo
   ```

3. Completá sus datos en `data/prendas.json` (lo que no sepas dejalo en `null`):

   ```jsonc
   {
     "id": "remera-negra-ac-dc",          // no lo cambies (es la carpeta)
     "nombre": "AC/DC Back in Black",
     "categoria": "remera",
     "fotos": { ... },                     // lo llena el script
     "colores": ["#151515", "#c9a227"],    // lo llena el script
     "marca": "Gildan",
     "banda_o_tema": "AC/DC",
     "anio": 2009,                          // aparece en la chapita de la percha
     "anecdota": "La compré en River, en el show del 2009.",
     "tags": ["banda", "rock"],             // aparecen como filtros
     "agregada": "2026-11-01"
   }
   ```

4. Mirala con `npm run dev`. Si algo del JSON está mal (un año con letras,
   un id repetido, una foto que no existe), `npm run validar` te dice qué y dónde.

**Las remeras de ejemplo**: cuando cargues las tuyas, borralas con `npm run limpiar-ejemplos`.

**Borrar una remera**: sacá su bloque de `data/prendas.json` y su carpeta en `public/prendas/`.

## 3. Cómo publicar (deploy)

El proyecto de Vercel está conectado al repo de GitHub: **cada `git push` publica solo**.

```bash
git add -A
git commit -m "Agrego remeras nuevas"
git push
```

En 1–2 minutos está online. El estado del deploy se ve en
[vercel.com/piono-piana/ropero](https://vercel.com/piono-piana/ropero).
Antes de publicar, Vercel corre `npm run validar`: si el JSON tiene un error, no publica
(y la versión anterior sigue andando).

## 4. Privacidad

- El repo de GitHub tiene que ser **privado** (GitHub › el repo › Settings › General ›
  abajo de todo, *Change visibility*).
- `fotos-crudas/` nunca se sube (está en `.gitignore`); solo las fotos procesadas.
- La página es pública para quien tenga el link, pero no se indexa en Google (`noindex`).

---

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Datos de las prendas | `data/prendas.json` |
| Reglas de los datos | `lib/schema.ts` |
| Fotos procesadas (se suben) | `public/prendas/<id>/` |
| Fotos originales (NO se suben) | `fotos-crudas/` |
| Script de fotos | `herramientas/procesar.ts` (sus dependencias viven en `herramientas/`, Vercel no las instala) |
| Escena 3D | `components/perchero/` |
| Ficha | `components/ficha/` |

Pensado para crecer: el modelo de datos ya acepta `pantalon`, `gorra`, `campera`,
`zapatillas`, etc. (`lib/schema.ts`), las URLs son `/<categoria>/<id>` y los colores
dominantes quedan guardados para el combinador de outfits de la Fase 2.
