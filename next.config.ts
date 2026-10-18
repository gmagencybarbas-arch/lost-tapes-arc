import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  experimental: {
    proxyClientMaxBodySize: '20mb',
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
