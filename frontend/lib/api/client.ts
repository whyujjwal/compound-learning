import { getAuthToken } from "../auth";
import { getClientTimezone } from "../time";

/** Same-origin /api in the browser (proxied by Next.js); absolute URL for any server-side use. */
export function getApiBase(): string {
  if (typeof window !== "undefined") return "/api";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
}

function errorMessageFromBody(raw: string, fallback: string): string {
  if (!raw) return fallback;
  try {
    const body = JSON.parse(raw) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : String(item)
        )
        .join("; ");
    }
    return JSON.stringify(body);
  } catch {
    return raw;
  }
}

/** Direct API URL for long-running browser calls (bypasses Next.js proxy). */
function getDirectApiBase(): string | null {
  if (typeof window === "undefined") return null;
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

type RequestOptions = RequestInit & {
  /** Call NEXT_PUBLIC_API_URL directly (needed for 60s+ AI requests). */
  direct?: boolean;
  timeoutMs?: number;
};

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export function setPagination(search: URLSearchParams, params?: PaginationParams): void {
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.offset) search.set("offset", String(params.offset));
}

export function queryString(search: URLSearchParams): string {
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { direct, timeoutMs, ...fetchOptions } = options ?? {};
  const base = direct && getDirectApiBase() ? getDirectApiBase()! : getApiBase();
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  const timezone = typeof window !== "undefined" ? getClientTimezone() : null;
  const res = await fetch(`${base}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(timezone ? { "X-Compound-Timezone": timezone } : {}),
      ...fetchOptions.headers,
    },
    cache: "no-store",
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : fetchOptions.signal,
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      const { clearAuthToken } = await import("../auth");
      clearAuthToken();
      window.location.href = "/login";
      throw new Error("Session expired — please sign in again");
    }
    const raw = await res.text();
    throw new Error(errorMessageFromBody(raw, res.statusText));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
