import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl">Esta prenda no está en el ropero</h1>
      <Link href="/" className="text-laton hover:underline">
        Volver al perchero
      </Link>
    </main>
  );
}
