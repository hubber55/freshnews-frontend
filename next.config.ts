import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  generateBuildId: () => 'build-' + Date.now(),
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
      ],
    },
  ],
};

export default nextConfig;
