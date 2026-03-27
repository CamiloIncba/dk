import { Link } from "react-router-dom";
import { useCart } from "../cart/useCart";
import { formatCurrency } from "../lib/format";

export function SiteHeader() {
  const { lines, subtotal } = useCart();
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
        <Link to="/" className="font-semibold tracking-tight text-foreground">
          Dark Kitchen
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Inicio
          </Link>
          <Link to="/menu" className="hover:text-foreground">
            Menú
          </Link>
          <Link to="/checkout" className="hover:text-foreground">
            Pedido
            {count > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {count}
              </span>
            ) : null}
          </Link>
          <Link to="/seguimiento" className="hover:text-foreground">
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
