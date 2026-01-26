import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@livestream-copilot/shared"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
