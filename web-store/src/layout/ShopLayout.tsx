import { Outlet } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";

export function ShopLayout() {
  return (
    <div className="min-h-dvh bg-muted/40">
      <SiteHeader />
      <Outlet />
    </div>
  );
}
