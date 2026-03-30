import { Link } from "react-router-dom";
import { useBrand, useBrandPaths } from "../brand/BrandContext";

export function HomePage() {
  const brand = useBrand();
  const p = useBrandPaths();

  return (
    <div className="container py-12">
      <section className="rounded-3xl border bg-gradient-to-br from-card to-muted/30 p-8 shadow-sm md:p-12">
        <p className="text-sm font-medium text-primary">{brand.heroEyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          {brand.heroTitle}
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{brand.heroBody}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={p.menu}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
          >
            Ver menú
          </Link>
          <Link
            to={p.track}
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted/50"
          >
            Seguir mi pedido
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {brand.features.map((item) => (
          <div key={item.title} className="rounded-xl border bg-background p-5">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
