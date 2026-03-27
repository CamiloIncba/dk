export type ErrorCtx = "menu" | "checkout" | "status";

export function getFriendlyError(context: ErrorCtx, err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") {
    return "La solicitud tardó demasiado. Revisá tu conexión e intentá de nuevo.";
  }
  if (err instanceof TypeError) {
    return "No pudimos conectar con el servidor. Verificá tu conexión.";
  }
  if (context === "menu") {
    return "No se pudo cargar el menú.";
  }
  if (context === "status") {
    return "No se pudo actualizar el estado del pedido.";
  }
  return "No se pudo procesar tu pedido. Intentá de nuevo.";
}
