import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: no API routes, no server actions. Hostable on Vercel and IPFS.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
