const isDevUrl = typeof window !== 'undefined' && 
  /\b(dev|staging)\b/i.test(window.location.hostname);

const isDev = import.meta.env.MODE === 'development' || 
              import.meta.env.VITE_DEV_RIBBON === 'true' ||
              isDevUrl;

export function DevRibbon() {
  if (!isDev) return null;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ width: '120px', height: '120px', overflow: 'hidden' }}
    >
      <div
        className="absolute bg-amber-500 text-amber-950 font-bold text-[10px] uppercase tracking-wider py-1 text-center shadow-md"
        style={{ width: '170px', left: '-35px', top: '25px', transform: 'rotate(-45deg)' }}
      >
        Desarrollo
      </div>
    </div>
  );
}
