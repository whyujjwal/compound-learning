export const AUTH_COOKIE = "compound-auth";
export const AUTH_STORAGE = "compound-auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_STORAGE) ?? readCookie(AUTH_COOKIE);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(AUTH_STORAGE, token);
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_STORAGE);
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export async function expectedToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("compound-app-v1"),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
