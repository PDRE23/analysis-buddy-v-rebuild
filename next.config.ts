import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.replit.dev', '*.spock.replit.dev', '*.kirk.replit.dev', '*.picard.replit.dev', '*.janeway.replit.dev'],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-dropdown-menu",
    ],
  },
  modularizeImports: {
    "date-fns": {
      transform: "date-fns/{{member}}",
      preventFullImport: true,
    },
  },
  turbopack: {},
  // Add security headers including CSP
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 'unsafe-eval' needed for Next.js dev mode, 'unsafe-inline' for print styles
              "script-src-attr 'self' 'unsafe-inline'", // Allow inline event handlers (onclick, etc.)
              "style-src 'self' 'unsafe-inline'", // Allow inline styles for print functionality
              "style-src-attr 'unsafe-inline'", // Allow inline style attributes
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss: https://*.supabase.co https://*.supabase.in",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors *",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  // Webpack config - only applies when using webpack (dev:webpack script)
  // Turbopack (default) doesn't use this config
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid disk cache corruption/locks on Windows
      config.cache = { type: "memory" };
    }
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization?.splitChunks,
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
      },
    };
    return config;
  },
};

export default nextConfig;
