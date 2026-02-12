import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../..", ".env") });

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
