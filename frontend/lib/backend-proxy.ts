/** Backend origin (no /api suffix) for server-side proxy routes. */
export function getBackendOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
  return raw.replace(/\/api\/?$/, "");
}

/** Proxy a request to the Compound API with an extended timeout. */
export async function proxyToBackend(
  request: Request,
  apiPath: string,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = `${getBackendOrigin()}${path}`;

  const headers = new Headers();
  const auth = request.headers.get("Authorization");
  if (auth) headers.set("Authorization", auth);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const res = await fetch(url, {
    method: request.method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  return new Response(await res.arrayBuffer(), {
    status: res.status,
    statusText: res.statusText,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
