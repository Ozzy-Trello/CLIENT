import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manualBuildVersion =
  process.env.APP_BUILD_VERSION ||
  process.env.NEXT_PUBLIC_APP_BUILD_VERSION ||
  process.env.npm_package_version ||
  '0.1.0';
const normalizedBuildVersion = manualBuildVersion
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]/g, '-');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_VERSION: manualBuildVersion,
  },
  // Keep build ID deterministic so cache busting is controlled manually.
  generateBuildId: async () => {
    return `build-${normalizedBuildVersion}`;
  },
  output: 'standalone',
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizeCss: true, // Disable CSS optimization to avoid SCSS parser
    optimizePackageImports: [
      '@tanstack/react-query', 
      'lucide-react',
      'react-hook-form',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ],
    webpackBuildWorker: false,
    gzipSize: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Docker-specific optimizations
 

    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\/]node_modules[\/](react|react-dom)[\/]/,
            name: 'react',
            priority: 20,
            reuseExistingChunk: true,
          },
          query: {
            test: /[\/]node_modules[\/]@tanstack[\/]react-query[\/]/,
            name: 'react-query',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Additional CSS minimization prevention
      if (process.env.DISABLE_CSS_MINIFICATION === 'true') {
        config.optimization.minimizer = config.optimization.minimizer.filter(
          plugin => plugin.constructor.name !== 'CssMinimizerPlugin'
        );
      }
    }

    // Let Next.js handle CSS imports natively

    // Optimize module resolution - match tsconfig.json paths
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@api': path.resolve(__dirname, './src/api'),
      '@app': path.resolve(__dirname, './src/app'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@dto': path.resolve(__dirname, './src/dto'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@store': path.resolve(__dirname, './src/store'),
      '@myTypes': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    };

    return config;
  },
  // Enable static optimization
  trailingSlash: false,
  // Optimize headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/pdf.worker.min.mjs',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
