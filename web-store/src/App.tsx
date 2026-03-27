import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
};

type Category = {
  id: number;
  name: string;
  products: Product[];
};

type MenuResponse = {
  categories: Category[];
};

type OrderStatusResponse = {
  id: number;
  status: string;
  kitchenStatus: string;
  totalAmount: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3010";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function App() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [createdOrderStatus, setCreatedOrderStatus] = useState<OrderStatusResponse | null>(null);

  useEffect(() => {
    const loadMenu = async () => {
      setLoadingMenu(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/v1/store/menu`);
        if (!res.ok) throw new Error("No se pudo cargar el menu");
        const data = (await res.json()) as MenuResponse;
        setMenu(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        setLoadingMenu(false);
      }
    };
    void loadMenu();
  }, []);

  const products = useMemo(
    () => menu?.categories.flatMap((category) => category.products) ?? [],
    [menu],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({
          product: productMap.get(Number(productId)),
          quantity,
        }))
        .filter((item) => item.product && item.quantity > 0) as {
        product: Product;
        quantity: number;
      }[],
    [cart, productMap],
  );

  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      ),
    [cartItems],
  );

  const addToCart = (productId: number) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const nextQty = (prev[productId] ?? 0) - 1;
      if (nextQty <= 0) {
        const clone = { ...prev };
        delete clone[productId];
        return clone;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const refreshStatus = async (orderId: number) => {
    const res = await fetch(`${API_URL}/api/v1/store/orders/${orderId}/status`);
    if (!res.ok) throw new Error("No se pudo consultar estado");
    const data = (await res.json()) as OrderStatusResponse;
    setCreatedOrderStatus(data);
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (cartItems.length === 0) {
      setError("El carrito esta vacio.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/store/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customer: { name, phone, address },
          paymentMethod: "transfer",
          note,
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear el pedido");
      const created = (await res.json()) as { id: number };
      setCreatedOrderId(created.id);
      await refreshStatus(created.id);
      setCart({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-muted/40 pb-10">
      <header className="container py-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Dark Kitchen</p>
          <h1 className="text-2xl font-semibold tracking-tight">Web Store Fase 1</h1>
          <p className="text-sm text-muted-foreground">
            Catalogo, carrito y checkout MVP conectados a `/api/v1/store`.
          </p>
        </div>
      </header>

      <section className="container grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {loadingMenu && <p className="text-sm text-muted-foreground">Cargando menu...</p>}
          {!loadingMenu &&
            menu?.categories.map((category) => (
              <article key={category.id} className="rounded-xl border bg-background p-4">
                <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {category.products.map((product) => (
                    <div key={product.id} className="rounded-lg border p-3">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.description || "Sin descripcion"}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-semibold">
                          {formatCurrency(Number(product.price))}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(product.id)}
                          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-background p-4">
            <h2 className="font-semibold">Carrito</h2>
            {cartItems.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Aun no agregaste productos.</p>
            )}
            <ul className="mt-3 space-y-2">
              {cartItems.map((item) => (
                <li key={item.product.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="rounded border px-2"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(item.product.id)}
                      className="rounded border px-2"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-semibold">Total: {formatCurrency(total)}</p>
          </div>

          <form onSubmit={submitOrder} className="rounded-xl border bg-background p-4">
            <h2 className="font-semibold">Checkout</h2>
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded-md border p-2 text-sm"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full rounded-md border p-2 text-sm"
                placeholder="Telefono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="w-full rounded-md border p-2 text-sm"
                placeholder="Direccion"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <textarea
                className="w-full rounded-md border p-2 text-sm"
                placeholder="Nota"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {isSubmitting ? "Enviando..." : "Crear pedido"}
            </button>
          </form>

          {createdOrderId && createdOrderStatus && (
            <div className="rounded-xl border bg-background p-4">
              <h2 className="font-semibold">Seguimiento</h2>
              <p className="mt-2 text-sm">Pedido #{createdOrderId}</p>
              <p className="text-sm">Pago: {createdOrderStatus.status}</p>
              <p className="text-sm">Cocina: {createdOrderStatus.kitchenStatus}</p>
              <button
                type="button"
                onClick={() => void refreshStatus(createdOrderId)}
                className="mt-3 rounded-md border px-3 py-1 text-sm"
              >
                Actualizar estado
              </button>
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
        </aside>
      </section>
    </main>
  );
}
