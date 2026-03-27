import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MenuResponse } from "../types";
import { getApiUrl, fetchWithTimeout } from "../api/storeApi";
import { formatCurrency, parsePrice } from "../lib/format";

export function CatalogPage() {
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
        if (!res.ok) throw new Error("menu");
        setMenu((await res.json()) as MenuResponse);
      } catch {
        setError("No se pudo cargar el menú. Intenta de nuevo en unos segundos.");
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

  return (
    <div className="container space-y-10 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Menú</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí un producto para ver extras y agregar al pedido.
        </p>
      </div>

      {menu?.categories.map((category) => (
        <section key={category.id} id={`cat-${category.id}`}>
          <h2 className="mb-4 text-lg font-semibold">{category.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.products.map((product) => (
              <Link
                key={product.id}
                to={`/producto/${product.id}`}
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
