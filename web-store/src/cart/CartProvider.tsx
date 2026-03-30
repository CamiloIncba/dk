import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CartContext } from "./cartContextInstance";
import { makeLineKey, lineTotal, type CartLine } from "./cartLine";

const DEFAULT_STORAGE_KEY = "dk-web-store-cart-v1";

export function CartProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}: {
  children: ReactNode;
  /** Clave por marca para no mezclar carritos entre Fersot y Stone Fungus */
  storageKey?: string;
}) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartLine[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, storageKey]);

  const addLine = useCallback(
    (
      line: Omit<CartLine, "key" | "quantity"> & { quantity?: number },
    ) => {
      const qtyAdd = line.quantity ?? 1;
      const key = makeLineKey(
        line.productId,
        line.extras.map((e) => ({ optionId: e.optionId, qty: e.qty })),
      );
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.key === key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + qtyAdd,
          };
          return next;
        }
        return [
          ...prev,
          {
            ...line,
            key,
            quantity: qtyAdd,
          },
        ];
      });
    },
    [],
  );

  const setQty = useCallback((key: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.key !== key);
      return prev.map((l) =>
        l.key === key ? { ...l, quantity } : l,
      );
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + lineTotal(l), 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      addLine,
      setQty,
      removeLine,
      clear,
      subtotal,
    }),
    [lines, addLine, setQty, removeLine, clear, subtotal],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}
