
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
  experimental: {
    serverComponentsExternalPackages: [
      '@genkit-ai/googleai',
      '@opentelemetry/api',
      '@opentelemetry/sdk-trace-node', // More specific than sdk-node for tracing
      // Removed @opentelemetry/sdk-node and @opentelemetry/sdk-trace-base
      // to see if this more minimal set resolves the issue.
    ],
  },
};

export default nextConfig;
