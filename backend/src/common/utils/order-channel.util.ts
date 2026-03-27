const CHANNEL_PATTERN = /\[CHANNEL:([A-Z0-9_]+)\]/;

export const ORDER_CHANNEL_UNKNOWN = 'UNKNOWN';

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
