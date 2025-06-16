
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
      { // Added for Firebase Storage
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // Required for Genkit to ensure server-side dependencies are handled correctly
  // and to enable environment variables to be passed to server components.
  serverExternalPackages: [
    '@genkit-ai/googleai',
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-node',
  ],
  // The webpack configuration block is removed as Turbopack is being used.
  // If specific issues handled by the webpack block reappear, they may need
  // Turbopack-specific solutions or might be handled by Turbopack automatically.
};

export default nextConfig;
