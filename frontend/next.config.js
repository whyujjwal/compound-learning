/** @type {import('next').NextConfig} */

/** Backend origin for same-origin /api rewrites (avoids browser CORS on auth status, etc.). */
function backendOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  return raw.replace(/\/api\/?$/, "");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const origin = backendOrigin();
    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/curriculum", destination: "/library", permanent: false },
      { source: "/track/:slug", destination: "/library/:slug", permanent: false },
      { source: "/curriculum/edit", destination: "/library", permanent: false },
    ];
  },
};

module.exports = nextConfig;
