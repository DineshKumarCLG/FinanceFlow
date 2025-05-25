
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
      '@opentelemetry/sdk-trace-node', 
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Prevent client-side bundling of server-only packages
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/exporter-jaeger': false, // Stub out Jaeger exporter
        // You could add other problematic optional exporters here if needed
      };
    }
    
    // Ensure 'async_hooks' is treated as external, especially if client-side code indirectly tries to resolve it.
    // This is a Node.js built-in and shouldn't be bundled for the browser.
    config.externals = [...config.externals, 'async_hooks'];

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
