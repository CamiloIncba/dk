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
const REQUEST_TIMEOUT_MS = 8000;

type AppErrorContext = "menu" | "checkout" | "status";

function getFriendlyApiError(context: AppErrorContext, err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") {
    return "La solicitud tardo demasiado. Revisa tu conexion e intenta nuevamente.";
  }

  if (err instanceof TypeError) {
    return "No se pudo conectar con el servidor. Verifica tu conexion a internet.";
  }

  if (context === "menu") {
    return "No se pudo cargar el menu. Intenta nuevamente en unos segundos.";
  }
  if (context === "status") {
    return "No se pudo actualizar el estado del pedido. Intenta nuevamente.";
  }
  return "No se pudo procesar tu pedido. Intenta nuevamente.";
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [createdOrderStatus, setCreatedOrderStatus] = useState<OrderStatusResponse | null>(null);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  useEffect(() => {
    const loadMenu = async () => {
      setLoadingMenu(true);
      setApiError(null);
      try {
        const res = await fetchWithTimeout(`${API_URL}/api/v1/store/menu`);
        if (!res.ok) throw new Error("No se pudo cargar el menu");
        const data = (await res.json()) as MenuResponse;
        setMenu(data);
      } catch (err) {
        setApiError(getFriendlyApiError("menu", err));
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
    setIsRefreshingStatus(true);
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/v1/store/orders/${orderId}/status`);
      if (!res.ok) throw new Error("No se pudo consultar estado");
      const data = (await res.json()) as OrderStatusResponse;
      setCreatedOrderStatus(data);
      setApiError(null);
    } catch (err) {
      setApiError(getFriendlyApiError("status", err));
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    if (!createdOrderId || isPollingPaused) return;

    const minDelay = 10_000;
    const maxDelay = 15_000;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    const timeoutId: number = window.setTimeout(() => {
      void refreshStatus(createdOrderId);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [createdOrderId, isPollingPaused, createdOrderStatus]);

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName && !trimmedPhone) {
      setCheckoutError("Ingresa tu nombre y telefono para continuar.");
      return;
    }
    if (!trimmedName) {
      setCheckoutError("El nombre es obligatorio.");
      return;
    }
    if (!trimmedPhone) {
      setCheckoutError("El telefono es obligatorio.");
      return;
    }

    if (cartItems.length === 0) {
      setCheckoutError("El carrito esta vacio.");
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    setApiError(null);
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/v1/store/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customer: { name: trimmedName, phone: trimmedPhone, address },
          paymentMethod: "transfer",
          note,
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear el pedido");
      const created = (await res.json()) as { id: number };
      setCreatedOrderId(created.id);
      setIsPollingPaused(false);
      await refreshStatus(created.id);
      setCart({});
    } catch (err) {
      setApiError(getFriendlyApiError("checkout", err));
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
            {checkoutError && (
              <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {checkoutError}
              </p>
            )}
          </form>

          {createdOrderId && createdOrderStatus && (
            <div className="rounded-xl border bg-background p-4">
              <h2 className="font-semibold">Seguimiento</h2>
              <p className="mt-2 text-sm">Pedido #{createdOrderId}</p>
              <p className="text-sm">Pago: {createdOrderStatus.status}</p>
              <p className="text-sm">Cocina: {createdOrderStatus.kitchenStatus}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void refreshStatus(createdOrderId)}
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  {isRefreshingStatus ? "Actualizando..." : "Actualizar estado"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPollingPaused((prev) => !prev)}
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  {isPollingPaused ? "Reanudar auto-actualizacion" : "Pausar auto-actualizacion"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isPollingPaused
                  ? "Auto-actualizacion detenida."
                  : "Auto-actualizacion activa cada 10-15 segundos."}
              </p>
            </div>
          )}

          {apiError && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{apiError}</p>}
        </aside>
      </section>
    </main>
  );
}
