import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 flora-bg-primary flora-pattern">
      <div className="max-w-md w-full bg-white rounded-3xl flora-shadow-accent p-8 flora-border border text-center">
        <div className="text-5xl mb-4">🌷</div>
        <h1 className="text-2xl font-bold flora-text-primary mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm flora-text-secondary mb-6">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 rounded-xl flora-gradient-accent text-white font-medium hover:opacity-90 transition flora-shadow-soft"
        >
          🌸 Voltar ao Bloom Studio
        </Link>
      </div>
    </div>
  );
}
