/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Enable SWC minification
  swcMinify: true,

  // Enable compression
  compress: true,

  // Optimize images
  images: {
    unoptimized: false,
    minimumCacheTTL: 60,
  },

  // Add these packages to the list of packages that should be transpiled
  transpilePackages: ['react-quill'],

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@ant-design/icons",
      "antd",
      "@hello-pangea/dnd"
    ],
  },

  // Cache build outputs
  poweredByHeader: false,
  generateEtags: true,
};

export default nextConfig;