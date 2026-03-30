import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MenuResponse } from "../types";
import { useBrandPaths } from "../brand/BrandContext";
import { getApiUrl, fetchWithTimeout } from "../api/storeApi";
import { getFriendlyError } from "./checkoutErrors";
import { formatCurrency, parsePrice } from "../lib/format";

export function CatalogPage() {
  const paths = useBrandPaths();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithTimeout(
          `${getApiUrl()}/api/v1/store/menu`,
        );
        if (!res.ok) {
          throw new Error(`MENU_HTTP_${res.status}`);
        }
        setMenu((await res.json()) as MenuResponse);
      } catch (e) {
        setError(getFriendlyError("menu", e));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (loading) {
    return (
      <div className="container py-10 text-sm text-muted-foreground">
        Cargando menú…
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  const categories = menu?.categories ?? [];

  return (
    <div className="container space-y-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menú</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí un producto para ver extras y agregar al pedido.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
          Todavía no hay categorías o productos públicos en el menú. Cargá datos con{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run prisma:seed</code>{" "}
          en la carpeta del backend (con la base migrada).
        </p>
      ) : null}

      {categories.map((category) => (
        <section key={category.id} id={`cat-${category.id}`}>
          <h2 className="mb-4 text-lg font-semibold">{category.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.products.map((product) => (
              <Link
                key={product.id}
                to={paths.product(product.id)}
                className="group rounded-xl border bg-background p-4 shadow-sm transition hover:border-primary/40"
              >
                <p className="font-medium group-hover:text-primary">
                  {product.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {product.description || "Ver detalle"}
                </p>
                <p className="mt-3 font-semibold">
                  {formatCurrency(parsePrice(product.price))}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
