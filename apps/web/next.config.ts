import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-cron', 'pg', 'web-push'],
};

export default nextConfig;
