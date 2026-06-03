import { cookies } from "next/headers";
import { AUTH_COOKIE } from "./auth";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
}

export async function serverApiGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${decodeURIComponent(token)}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(raw || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
