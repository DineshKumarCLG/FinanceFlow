
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Required for Genkit to ensure server-side dependencies are handled correctly
  // and to enable environment variables to be passed to server components.
  // As of Genkit 1.x and Next.js 14+, this might not be strictly necessary for all cases
  // if 'use server' is correctly applied, but good for ensuring env vars.
  // experimental: {
  //   serverComponentsExternalPackages: ['@genkit-ai/googleai'],
  // },
};

export default nextConfig;
