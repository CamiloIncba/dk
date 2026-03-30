import { Navigate, Outlet, useParams } from "react-router-dom";
import { getBrandBySlug } from "../brand/brands";
import { BrandProvider } from "../brand/BrandContext";
import { CartProvider } from "../cart/CartProvider";
import { getStoneFungusStoreUrl } from "../brand/stoneFungusStore";
import { StoneFungusExternalRedirect } from "../pages/StoneFungusExternalRedirect";

export function BrandRouteWrapper() {
  const { brandSlug } = useParams();
  const brand = getBrandBySlug(brandSlug ?? "");
  if (!brand) {
    return <Navigate to="/" replace />;
  }

  if (brand.id === "sf") {
    const sfUrl = getStoneFungusStoreUrl();
    if (sfUrl) {
      return <StoneFungusExternalRedirect href={sfUrl} />;
    }
  }

  return (
    <BrandProvider brand={brand}>
      <CartProvider storageKey={`dk-web-store-cart-${brand.id}`}>
        <Outlet />
      </CartProvider>
    </BrandProvider>
  );
}
