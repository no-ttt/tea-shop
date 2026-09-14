import { cache } from "react";
import { headers } from "next/headers";

export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host");
  if (!host) {
    throw new Error("getBaseUrl: missing Host header");
  }
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function fetchJsonUncached<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`fetchJson failed: ${res.status} ${res.statusText} (${path})`);
  }
  return res.json() as Promise<T>;
}

/**
 * 用 React cache() 做同一次 request 內的去重：layout.tsx 與 page.tsx
 * 都會呼叫 fetchJson("/api/site-settings")，包上 cache() 後同一請求只會真正 fetch 一次。
 */
export const fetchJson = cache(fetchJsonUncached);
