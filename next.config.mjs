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

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@ant-design/icons",
      "antd",
      "@hello-pangea/dnd"
    ]
  },

  // Cache build outputs
  poweredByHeader: false,
  generateEtags: true,
};

export default nextConfig;