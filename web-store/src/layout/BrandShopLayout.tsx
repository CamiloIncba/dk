import { Outlet } from "react-router-dom";
import { useBrand } from "../brand/BrandContext";
import { SiteHeader } from "../components/SiteHeader";

export function BrandShopLayout() {
  const brand = useBrand();
  return (
    <div
      className="brand-store min-h-dvh bg-muted/40"
      data-brand={brand.id}
    >
      <SiteHeader />
      <Outlet />
    </div>
  );
}
