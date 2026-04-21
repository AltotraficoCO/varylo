import type { NextConfig } from "next";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['localhost:3000'];

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.wompi.co https://connect.facebook.net https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.openai.com https://production.wompi.co https://sandbox.wompi.co https://graph.facebook.com https://www.googleapis.com https://*.supabase.co https://connect.facebook.net https://vercel.live wss://ws-us3.pusher.com",
  "frame-src 'self' https://checkout.wompi.co https://www.facebook.com https://web.facebook.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.facebook.com https://web.facebook.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
];

const nextConfig: NextConfig = {
  transpilePackages: ['@formatjs/intl-localematcher'],
  experimental: {
    serverActions: {
      allowedOrigins,
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
