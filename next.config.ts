
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
  serverExternalPackages: ['@genkit-ai/googleai', '@opentelemetry/sdk-trace-node'],
  webpack: (config, { isServer, nextRuntime }) => {
    // Avoid AWS SDK V2 bundling if V3 is used
    // https://github.com/aws/aws-sdk-js-v3/issues/4421
    // This is a common workaround for packages that might optionally try to import large SDKs
    // or Node.js specific modules on the client.
    if (!isServer && nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@aws-sdk/credential-providers': false, // Example, adjust if needed for other problematic packages
        '@opentelemetry/exporter-jaeger': false,
      };
    }
    if (!isServer && nextRuntime !== 'edge') {
       config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/exporter-jaeger': false,
      };
      config.externals = [
        ...(config.externals || []),
        'async_hooks', // Ensure async_hooks is external for client bundles
      ];
    }


    return config;
  },
};

export default nextConfig;
