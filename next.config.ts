
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
      '@opentelemetry/sdk-node',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      // Add other OpenTelemetry packages if specific errors point to them
    ],
  },
};

export default nextConfig;
