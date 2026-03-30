import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { MenuResponse, ProductExtraGroupDto } from "../types";
import { useBrandPaths } from "../brand/BrandContext";
import { getApiUrl, fetchWithTimeout } from "../api/storeApi";
import { formatCurrency, parsePrice } from "../lib/format";
import { useCart } from "../cart/useCart";
import type { CartExtra } from "../cart/cartLine";

type Opt = { id: number; name: string; finalPrice: number };

function getAvailableOptions(group: ProductExtraGroupDto): Opt[] {
  if (group.customOptions?.length) {
    return group.customOptions.map((co) => ({
      id: co.option.id,
      name: co.option.name,
      finalPrice:
        co.priceOverride !== null && co.priceOverride !== ""
          ? parsePrice(co.priceOverride)
          : parsePrice(co.option.price),
    }));
  }
  return group.group.options
    .filter((o) => o.active)
    .map((o) => ({
      id: o.id,
      name: o.name,
      finalPrice: parsePrice(o.price),
    }));
}

function maxForGroup(group: ProductExtraGroupDto): number {
  if (group.maxSelections != null) return group.maxSelections;
  if (group.group.maxSelections != null) return group.group.maxSelections;
  return 999;
}

export function ProductPage() {
  const paths = useBrandPaths();
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const { addLine } = useCart();

  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [groups, setGroups] = useState<ProductExtraGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Map<number, Map<number, number>>>(
    () => new Map(),
  );

  const product = useMemo(() => {
    if (!menu || !Number.isFinite(productId)) return undefined;
    for (const c of menu.categories) {
      const p = c.products.find((x) => x.id === productId);
      if (p) return p;
    }
    return undefined;
  }, [menu, productId]);

  const initSelections = useCallback((g: ProductExtraGroupDto[]) => {
    const m = new Map<number, Map<number, number>>();
    g.forEach((row) => m.set(row.groupId, new Map()));
    setSelections(m);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setError("Producto inválido");
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [menuRes, exRes] = await Promise.all([
          fetchWithTimeout(`${getApiUrl()}/api/v1/store/menu`),
          fetchWithTimeout(
            `${getApiUrl()}/api/v1/store/products/${productId}/extras`,
          ),
        ]);
        if (!menuRes.ok) throw new Error("menu");
        const menuJson = (await menuRes.json()) as MenuResponse;
        setMenu(menuJson);
        if (exRes.ok) {
          const exJson = (await exRes.json()) as ProductExtraGroupDto[];
          setGroups(Array.isArray(exJson) ? exJson : []);
          initSelections(Array.isArray(exJson) ? exJson : []);
        } else {
          setGroups([]);
          initSelections([]);
        }
      } catch {
        setError("No pudimos cargar el producto.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [productId, initSelections]);

  const getTotalSelected = (groupId: number): number => {
    const g = selections.get(groupId);
    if (!g) return 0;
    let n = 0;
    g.forEach((q) => {
      n += q;
    });
    return n;
  };

  const toggleOption = (groupId: number, optionId: number) => {
    const gRow = groups.find((x) => x.groupId === groupId);
    if (!gRow) return;
    const max = maxForGroup(gRow);
    setSelections((prev) => {
      const next = new Map(prev);
      const inner = new Map(next.get(groupId) ?? []);
      const cur = inner.get(optionId) ?? 0;
      let total = 0;
      inner.forEach((q) => {
        total += q;
      });
      if (cur > 0) inner.delete(optionId);
      else if (total < max) inner.set(optionId, 1);
      next.set(groupId, inner);
      return next;
    });
  };

  const extrasValid = (): boolean => {
    for (const g of groups) {
      const min = g.group.minSelections ?? 0;
      if (getTotalSelected(g.groupId) < min) return false;
    }
    return true;
  };

  const buildCartExtras = (): CartExtra[] => {
    const out: CartExtra[] = [];
    selections.forEach((inner, groupId) => {
      const gRow = groups.find((x) => x.groupId === groupId);
      if (!gRow) return;
      const opts = getAvailableOptions(gRow);
      inner.forEach((qty, optionId) => {
        if (qty < 1) return;
        const opt = opts.find((o) => o.id === optionId);
        if (opt) {
          out.push({
            optionId,
            name: opt.name,
            unitPrice: opt.finalPrice,
            qty,
          });
        }
      });
    });
    return out;
  };

  const extrasSubtotal = (): number =>
    buildCartExtras().reduce((s, e) => s + e.unitPrice * e.qty, 0);

  const handleAdd = () => {
    if (!product) return;
    if (!extrasValid()) return;
    const ex = buildCartExtras();
    addLine({
      productId: product.id,
      productName: product.name,
      baseUnitPrice: parsePrice(product.price),
      extras: ex,
    });
    navigate(paths.checkout);
  };

  if (loading) {
    return (
      <div className="container py-10 text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-10 space-y-4">
        <p className="text-destructive">{error ?? "Producto no encontrado"}</p>
        <Link to={paths.menu} className="text-sm text-primary underline">
         Volver al menú
        </Link>
      </div>
    );
  }

  const unitTotal = parsePrice(product.price) + extrasSubtotal();

  return (
    <div className="container max-w-lg space-y-6 py-10">
      <Link
        to={paths.menu}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Menú
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        {product.description ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
        <p className="mt-3 text-lg font-semibold">
          {formatCurrency(parsePrice(product.price))}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            base
          </span>
        </p>
      </div>

      {groups.length > 0 && (
        <div className="space-y-6">
          {groups.map((gRow) => {
            const opts = getAvailableOptions(gRow);
            const max = maxForGroup(gRow);
            const min = gRow.group.minSelections ?? 0;
            const sel = getTotalSelected(gRow.groupId);
            return (
              <div key={gRow.groupId} className="rounded-xl border bg-background p-4">
                <h2 className="font-medium">{gRow.group.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {min > 0 ? `Mínimo ${min}` : "Opcional"}
                  {max < 999 ? ` · Máximo ${max}` : ""}
                  <span className={sel < min ? " text-destructive" : " text-primary"}>
                    {" "}
                    · {sel} seleccionados
                  </span>
                </p>
                <ul className="mt-3 space-y-2">
                  {opts.map((opt) => {
                    const on = (selections.get(gRow.groupId)?.get(opt.id) ?? 0) > 0;
                    const can = on || sel < max;
                    return (
                      <li key={opt.id}>
                        <button
                          type="button"
                          disabled={!can && !on}
                          onClick={() => toggleOption(gRow.groupId, opt.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                            on
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/50"
                          } ${!can && !on ? "opacity-50" : ""}`}
                        >
                          <span>{opt.name}</span>
                          <span>
                            {opt.finalPrice > 0
                              ? `+${formatCurrency(opt.finalPrice)}`
                              : "Gratis"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total estimado</span>
          <span className="font-semibold">{formatCurrency(unitTotal)}</span>
        </div>
        <button
          type="button"
          disabled={!extrasValid()}
          onClick={handleAdd}
          className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}
