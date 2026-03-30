import { Link } from "react-router-dom";
import { useBrand, useBrandPaths } from "../brand/BrandContext";
import { useCart } from "../cart/useCart";
import { formatCurrency } from "../lib/format";

export function SiteHeader() {
  const brand = useBrand();
  const p = useBrandPaths();
  const { lines, subtotal } = useCart();
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to={p.home}
            className="truncate font-semibold tracking-tight text-foreground hover:opacity-90"
          >
            {brand.displayName}
          </Link>
          <span className="truncate text-xs text-muted-foreground">
            {brand.tagline}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Marcas
          </Link>
          <Link to={p.home} className="hover:text-foreground">
            Inicio
          </Link>
          <Link to={p.menu} className="hover:text-foreground">
            Menú
          </Link>
          <Link to={p.checkout} className="hover:text-foreground">
            Pedido
            {count > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {count}
              </span>
            ) : null}
          </Link>
          <Link to={p.track} className="hover:text-foreground">
            Seguimiento
          </Link>
        </nav>
        {count > 0 && (
          <span className="text-sm text-muted-foreground">
            Subtotal {formatCurrency(subtotal)}
          </span>
        )}
      </div>
    </header>
  );
}
