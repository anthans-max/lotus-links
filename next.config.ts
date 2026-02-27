import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'lotus-links.vercel.app' }],
        destination: 'https://links.getlotusai.com/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
