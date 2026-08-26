import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve a per-build git commit hash so the build ID changes on every deploy,
// even when APP_BUILD_VERSION is pinned in .env. Falls back to a timestamp when
// git is unavailable (e.g. shallow/exported source tree).
let gitBuildHash = '';
try {
  gitBuildHash = execSync('git rev-parse --short HEAD', {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
} catch {
  gitBuildHash = '';
}

const manualBuildVersion =
  process.env.APP_BUILD_VERSION ||
  process.env.NEXT_PUBLIC_APP_BUILD_VERSION ||
  process.env.npm_package_version ||
  '0.1.0';

// Build ID must be unique per build so hashed chunk paths change on every
// deploy. A deterministic ID caused stale immutable-cached chunks to collide
// with new content, throwing "Cannot read properties of undefined (reading
// 'call')" on first load until a hard refresh.
const uniqueBuildId = `${manualBuildVersion}-${gitBuildHash || Date.now()}`;
const normalizedBuildVersion = uniqueBuildId
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]/g, '-');
const appBuildId = `build-${normalizedBuildVersion}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_VERSION: manualBuildVersion,
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
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
    if (!dev && !isServer) {
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
        // HTML, RSC payloads and API responses must never be cached by
        // proxies/browsers; stale cached HTML is what references deleted
        // chunks after a deploy and produces white screens.
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-App-Build',
            value: appBuildId,
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
