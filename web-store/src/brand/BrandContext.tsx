import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BrandDefinition } from "./brands";

const BrandContext = createContext<BrandDefinition | null>(null);

export function BrandProvider({
  brand,
  children,
}: {
  brand: BrandDefinition;
  children: ReactNode;
}) {
  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandDefinition {
  const v = useContext(BrandContext);
  if (!v) {
    throw new Error("useBrand debe usarse dentro de BrandProvider");
  }
  return v;
}

export function useBrandPaths() {
  const { id } = useBrand();
  const base = `/${id}`;
  return useMemo(
    () => ({
      base,
      home: base,
      menu: `${base}/menu`,
      checkout: `${base}/checkout`,
      track: `${base}/seguimiento`,
      trackOrder: (orderId: number | string) =>
        `${base}/seguimiento/${orderId}`,
      product: (productId: number | string) =>
        `${base}/producto/${productId}`,
    }),
    [base, id],
  );
}

export type { BrandSlug } from "./brands";
