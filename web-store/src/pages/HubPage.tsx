import { Link } from "react-router-dom";
import { listBrands } from "../brand/brands";
import { getStoneFungusStoreUrl } from "../brand/stoneFungusStore";

export function HubPage() {
  const brands = listBrands();
  const sfExternal = getStoneFungusStoreUrl();

  return (
    <div className="min-h-dvh bg-muted/40">
      <main className="container py-10">
        <div className="grid gap-6 md:grid-cols-2">
          {brands.map((b) => {
            const isSfExternal = b.id === "sf" && sfExternal;
            const className = `hub-card hub-card--${b.id} group rounded-2xl border bg-card p-8 shadow-sm transition hover:shadow-md`;
            if (isSfExternal) {
              return (
                <a
                  key={b.id}
                  href={sfExternal}
                  className={className}
                >
                  <h2 className="text-2xl font-semibold">{b.displayName}</h2>
                </a>
              );
            }
            return (
              <Link key={b.id} to={`/${b.id}`} className={className}>
                <h2 className="text-2xl font-semibold">{b.displayName}</h2>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
