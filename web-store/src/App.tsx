import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BrandRouteWrapper } from "./layout/BrandRouteWrapper";
import { BrandShopLayout } from "./layout/BrandShopLayout";
import { HubPage } from "./pages/HubPage";
import { BrandIndexPage } from "./pages/BrandIndexPage";
import { BrandMenuPage } from "./pages/BrandMenuPage";
import { ProductPage } from "./pages/ProductPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { TrackPage } from "./pages/TrackPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/:brandSlug" element={<BrandRouteWrapper />}>
          <Route element={<BrandShopLayout />}>
            <Route index element={<BrandIndexPage />} />
            <Route path="menu" element={<BrandMenuPage />} />
            <Route path="producto/:id" element={<ProductPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="seguimiento" element={<TrackPage />} />
            <Route path="seguimiento/:id" element={<TrackPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
