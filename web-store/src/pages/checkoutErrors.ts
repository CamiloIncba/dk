export type ErrorCtx = "menu" | "checkout" | "status" | "quote";

function isMenuHttpError(err: unknown): err is Error {
  return err instanceof Error && err.message.startsWith("MENU_HTTP_");
}

function menuHttpStatus(err: Error): string {
  return err.message.replace("MENU_HTTP_", "");
}

export function getFriendlyError(context: ErrorCtx, err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") {
    return "La solicitud tardó demasiado. Revisá tu conexión e intentá de nuevo.";
  }
  if (context === "menu" && err instanceof TypeError) {
    return (
      "No pudimos conectar con el servidor del menú. Levantá el backend " +
      "(en la carpeta «backend»: migraciones Prisma, base PostgreSQL activa y luego " +
      "«npm run start:dev», puerto 3010 por defecto). Copiá «backend/.env.example» " +
      "a «backend/.env» y revisá DATABASE_URL."
    );
  }
  if (context === "menu" && isMenuHttpError(err)) {
    const code = menuHttpStatus(err);
    return `El servidor respondió con error HTTP ${code}. Revisá la consola del backend y que la base de datos esté migrada y accesible.`;
  }
  if (err instanceof TypeError) {
    return "No pudimos conectar con el servidor. Verificá tu conexión.";
  }
  if (context === "menu") {
    return "No se pudo cargar el menú. Intentá de nuevo en unos segundos.";
  }
  if (context === "status") {
    return "No se pudo actualizar el estado del pedido.";
  }
  if (context === "quote") {
    return "No pudimos validar el total con el servidor. Podés intentar confirmar igual o volver al carrito.";
  }
  return "No se pudo procesar tu pedido. Intentá de nuevo.";
}
