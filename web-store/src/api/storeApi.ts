import type { CartQuoteResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3010";
export const getApiUrl = () => API_URL;

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export type CartLineExtra = { optionId: number; quantity: number };

export type CartQuoteItemPayload = {
  productId: number;
  quantity: number;
  extras: CartLineExtra[];
};

export async function postStoreQuote(
  items: CartQuoteItemPayload[],
): Promise<CartQuoteResponse> {
  const res = await fetchWithTimeout(`${getApiUrl()}/api/v1/store/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("quote");
  return (await res.json()) as CartQuoteResponse;
}
