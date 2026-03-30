import { OrderChannel } from '@prisma/client';

const CHANNEL_PATTERN = /\[CHANNEL:([A-Z0-9_]+)\]/;

export const ORDER_CHANNEL_UNKNOWN = 'UNKNOWN';

export const CHANNEL_LABELS: Record<string, string> = {
  IN_STORE: 'Local',
  WEB_STORE: 'Web',
  PEDIDOS_YA: 'PedidosYa',
  UBER_EATS: 'Uber Eats',
  WHATSAPP: 'WhatsApp',
  UNKNOWN: 'Desconocido',
};

/**
 * Resolves channel: prefers the DB column value, falls back to note parsing
 * for backwards compatibility with orders created before the migration.
 */
export function resolveOrderChannel(
  dbChannel?: OrderChannel | null,
  note?: string | null,
): string {
  if (dbChannel && dbChannel !== OrderChannel.IN_STORE) return dbChannel;
  if (dbChannel === OrderChannel.IN_STORE) {
    const fromNote = extractOrderChannelFromNote(note);
    return fromNote !== ORDER_CHANNEL_UNKNOWN ? fromNote : dbChannel;
  }
  return extractOrderChannelFromNote(note);
}

export function extractOrderChannelFromNote(note?: string | null): string {
  if (!note) {
    return ORDER_CHANNEL_UNKNOWN;
  }

  const match = note.toUpperCase().match(CHANNEL_PATTERN);
  if (!match?.[1]) {
    return ORDER_CHANNEL_UNKNOWN;
  }

  return match[1];
}
