/** URL pública de la tienda Stone Fungus (repo dedicado dk-frontend). Sin slash final. */
export function getStoneFungusStoreUrl(): string | null {
  const raw = import.meta.env.VITE_STONE_FUNGUS_STORE_URL;
  if (typeof raw !== "string") return null;
  const u = raw.trim().replace(/\/$/, "");
  return u.length > 0 ? u : null;
}

export function isStoneFungusExternal(): boolean {
  return getStoneFungusStoreUrl() != null;
}
