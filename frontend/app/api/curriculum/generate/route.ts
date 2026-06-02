import { proxyToBackend } from "@/lib/backend-proxy";

/** Roadmap generation can take 60–90s; Next.js rewrites time out at ~30s. */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    return await proxyToBackend(request, "/api/curriculum/generate", {
      timeoutMs: 180_000,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "TimeoutError"
        ? "Roadmap generation timed out. Try again with a narrower goal."
        : "Could not reach the API. Please try again.";
    return Response.json({ detail: message }, { status: 504 });
  }
}
