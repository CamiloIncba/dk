import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../cart/useCart";
import { lineTotal } from "../cart/cartLine";
import { getApiUrl, fetchWithTimeout } from "../api/storeApi";
import { formatCurrency } from "../lib/format";
import { getFriendlyError } from "./checkoutErrors";

type Step = 1 | 2 | 3;

export function CheckoutPage() {
  const { lines, subtotal, setQty, removeLine, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lines.length === 0 && step !== 1) setStep(1);
  }, [lines.length, step]);

  const validateContacts = (): string | null => {
    const n = name.trim();
    const p = phone.trim();
    const a = address.trim();
    if (!n) return "El nombre es obligatorio.";
    if (!p) return "El teléfono es obligatorio.";
    if (p.replace(/\D/g, "").length < 8) return "Ingresá un teléfono válido.";
    if (!a) return "La dirección de entrega es obligatoria.";
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateContacts();
    if (v) {
      setCheckoutError(v);
      return;
    }
    if (lines.length === 0) {
      setCheckoutError("Tu pedido está vacío.");
      return;
    }

    setSubmitting(true);
    setCheckoutError(null);
    setApiError(null);
    try {
      const res = await fetchWithTimeout(`${getApiUrl()}/api/v1/store/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            extras: l.extras.map((ex) => ({
              optionId: ex.optionId,
              quantity: ex.qty,
            })),
          })),
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          },
          paymentMethod: "transfer",
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("order");
      const created = (await res.json()) as { id: number };
      clear();
      navigate(`/seguimiento/${created.id}`, { replace: true });
    } catch (err) {
      setApiError(getFriendlyError("checkout", err));
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="container max-w-lg space-y-4 py-12">
        <h1 className="text-xl font-semibold">Tu pedido</h1>
        <p className="text-sm text-muted-foreground">
          El carrito está vacío. Explorá el menú para armar tu pedido.
        </p>
        <Link
          to="/menu"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Ir al menú
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-lg space-y-8 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      <div className="flex gap-2 text-xs font-medium">
        {[
          [1, "Carrito"],
          [2, "Datos"],
          [3, "Confirmar"],
        ].map(([n, label]) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${
              step === n
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {n}. {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.key}
                className="rounded-xl border bg-background p-4 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{line.productName}</p>
                    {line.extras.length > 0 && (
                      <ul className="mt-1 text-muted-foreground">
                        {line.extras.map((ex) => (
                          <li key={ex.optionId}>
                            + {ex.name}
                            {ex.qty > 1 ? ` ×${ex.qty}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="text-destructive hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border px-2"
                      onClick={() => setQty(line.key, line.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      className="rounded border px-2"
                      onClick={() => setQty(line.key, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(lineTotal(line))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-right font-semibold">
            Subtotal {formatCurrency(subtotal)}
          </p>
          <button
            type="button"
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground"
            onClick={() => setStep(2)}
          >
            Continuar
          </button>
        </div>
      )}

      {step === 2 && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const err = validateContacts();
            setCheckoutError(err);
            if (!err) setStep(3);
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <input
              required
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Teléfono</label>
            <input
              required
              type="tel"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección de entrega</label>
            <input
              required
              className="w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Calle, número, comuna…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <textarea
              className="w-full rounded-md border bg-background p-2 text-sm"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {checkoutError && (
            <p className="text-sm text-destructive">{checkoutError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border py-2 text-sm"
              onClick={() => setStep(1)}
            >
              Atrás
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary py-2 text-sm text-primary-foreground"
            >
              Revisar pedido
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p className="font-medium">Resumen</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {lines.map((l) => (
                <li key={l.key}>
                  {l.quantity}× {l.productName} — {formatCurrency(lineTotal(l))}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">
              Total {formatCurrency(subtotal)}
            </p>
            <hr className="my-3 border-border" />
            <p>
              {name.trim()} · {phone.trim()}
            </p>
            <p className="text-muted-foreground">{address.trim()}</p>
            {note.trim() ? (
              <p className="mt-1 text-muted-foreground">Nota: {note.trim()}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Pago acordado: transferencia (confirmación manual o link en
              fases siguientes).
            </p>
          </div>
          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border py-2 text-sm"
              onClick={() => setStep(2)}
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
