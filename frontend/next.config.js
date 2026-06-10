const withSerwistInit = require("@serwist/next").default;

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

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

module.exports = withSerwist(nextConfig);
