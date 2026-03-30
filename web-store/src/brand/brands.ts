export const BRAND_SLUGS = ["fersot", "sf"] as const;

export type BrandSlug = (typeof BRAND_SLUGS)[number];

export type BrandDefinition = {
  id: BrandSlug;
  displayName: string;
  tagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  features: Array<{ title: string; desc: string }>;
};

const brands: Record<BrandSlug, BrandDefinition> = {
  fersot: {
    id: "fersot",
    displayName: "Fersot",
    tagline: "Empanadas y sabor de verdad",
    heroEyebrow: "Marca Fersot",
    heroTitle: "Empanadas artesanales y combos para compartir",
    heroBody:
      "Pedí online con el mismo equipo y cocina que Stone Fungus: calidad de dark kitchen y delivery a tu puerta.",
    features: [
      {
        title: "Menú Fersot",
        desc: "Categorías de empanadas y platos de la línea Fersot, con extras donde aplique.",
      },
      {
        title: "Tu pedido, tu marca",
        desc: "Checkout y seguimiento con identidad Fersot. Un solo sistema operativo detrás.",
      },
      {
        title: "Seguimiento claro",
        desc: "Estado del pedido y timeline como en la tienda principal.",
      },
    ],
  },
  sf: {
    id: "sf",
    displayName: "Stone Fungus",
    tagline: "Pizza y masa madre",
    heroEyebrow: "Marca Stone Fungus",
    heroTitle: "Pizza y propuestas de la casa Stone Fungus",
    heroBody:
      "Misma cocina y logística que Fersot, con la vibra y el menú propios de Stone Fungus.",
    features: [
      {
        title: "Menú Stone Fungus",
        desc: "Pizzas y especialidades de la marca, personalizables con extras.",
      },
      {
        title: "Experiencia propia",
        desc: "Colores, tono y recorrido de compra alineados a Stone Fungus.",
      },
      {
        title: "Un backend, dos tiendas",
        desc: "Los pedidos entran al mismo flujo operativo para cocina y despacho.",
      },
    ],
  },
};

export function getBrandBySlug(slug: string): BrandDefinition | null {
  if (slug === "fersot" || slug === "sf") return brands[slug];
  return null;
}

export function listBrands(): BrandDefinition[] {
  return [brands.fersot, brands.sf];
}
