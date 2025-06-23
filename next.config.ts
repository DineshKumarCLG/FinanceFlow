import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'b2bf6082-00ac-46f3-abf2-c2b14ce6677e-00-54hv5zgi9quq.pike.replit.dev'
  ],
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
      // Firebase Storage pattern removed
      // {
      //   protocol: 'https',
      //   hostname: 'firebasestorage.googleapis.com',
      // },
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