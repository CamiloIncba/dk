export default function App() {
  return (
    <main className="min-h-dvh">
      <header className="container py-10">
        <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Dark Kitchen</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Web Store (Fase 1)
            </h1>
            <p className="text-sm text-muted-foreground">
              Tailwind + shadcn/ui listo. Próximo: catálogo, carrito y checkout.
            </p>
          </div>
        </div>
      </header>
    </main>
  );
}
