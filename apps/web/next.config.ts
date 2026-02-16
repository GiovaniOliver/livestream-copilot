import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@livestream-copilot/shared"],
  images: {
    remotePatterns: [],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_DESKTOP_API_URL: process.env.NEXT_PUBLIC_DESKTOP_API_URL,
    NEXT_PUBLIC_DESKTOP_WS_URL: process.env.NEXT_PUBLIC_DESKTOP_WS_URL,
  },
};

export default nextConfig;
