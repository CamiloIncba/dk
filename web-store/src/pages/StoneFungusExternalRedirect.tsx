import { useEffect, useState } from "react";

/**
 * Redirige al navegador fuera del web-store hacia la app Stone Fungus (dk-frontend).
 */
export function StoneFungusExternalRedirect({ href }: { href: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      window.location.replace(href);
    } catch {
      setFailed(true);
    }
  }, [href]);

  if (failed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No se pudo abrir la tienda Stone Fungus automáticamente.
        </p>
        <a
          href={href}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Abrir tienda Stone Fungus
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        Redirigiendo a Stone Fungus…
      </p>
    </div>
  );
}
