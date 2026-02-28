import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
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
