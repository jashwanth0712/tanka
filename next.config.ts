import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: no API routes, no server actions. Hostable on Vercel and IPFS.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // The floating dev badge overlaps the left rail; build errors still show in the overlay.
  devIndicators: false,
};

export default nextConfig;
