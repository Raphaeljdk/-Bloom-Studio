/**
 * Loading UI global — mostrada durante carregamento de Server Components.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center flora-bg-primary">
      <div className="text-center">
        <div className="text-5xl flora-petal-float mb-4">🌸</div>
        <p className="flora-text-secondary text-sm">Carregando...</p>
      </div>
    </div>
  );
}
