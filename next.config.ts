import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // A lockfile outside this repo was making Next treat the user home as the
  // workspace root and proxy dev requests back to itself.
  outputFileTracingRoot: path.resolve(process.cwd()),
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      },
      {
        // One URL segment only, so /api/app/conversations/test.png cannot match.
        // The private /api/app rule is also last, in case a later matcher overlaps.
        source:
          '/:file([^/]+\\.svg|[^/]+\\.jpg|[^/]+\\.jpeg|[^/]+\\.png|[^/]+\\.webp|[^/]+\\.ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          }
        ]
      },
      {
        source: '/api/app/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store'
          }
        ]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
