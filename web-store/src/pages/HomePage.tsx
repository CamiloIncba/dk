import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="container py-12">
      <section className="rounded-3xl border bg-gradient-to-br from-card to-muted/30 p-8 shadow-sm md:p-12">
        <p className="text-sm font-medium text-primary">Pizzería y empanadas</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Pedí online. Preparamos tu pedido y te lo enviamos.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Menú actualizado, extras por producto y seguimiento del pedido en tiempo
          casi real. Ideal para dark kitchen y delivery.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/menu"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
          >
            Ver menú
          </Link>
          <Link
            to="/seguimiento"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted/50"
          >
            Seguir mi pedido
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          {
            t: "Catálogo completo",
            d: "Categorías, fichas de producto y personalización con extras.",
          },
          {
            t: "Checkout claro",
            d: "Datos de contacto, dirección y resumen antes de confirmar.",
          },
          {
            t: "Estado del pedido",
            d: "Timeline amigable: pago, cocina, listo y entregado.",
          },
        ].map((item) => (
          <div key={item.t} className="rounded-xl border bg-background p-5">
            <h2 className="font-semibold">{item.t}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
