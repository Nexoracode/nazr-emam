import type { NextConfig } from 'next';

// در production (تک‌کانتینر روی CapRover) مرورگر باید API را same-origin روی
// «/api/*» صدا بزند تا از همان دامنه‌ی SSL عبور کند و نیازی به CORS نباشد؛
// این rewrite آن را به NestJS داخل همان کانتینر (localhost:3001) پراکسی می‌کند.
// مقصدِ rewrite موقع `next build` داخل routes-manifest ثابت می‌شود، پس
// INTERNAL_API_URL باید در زمان build در دسترس باشد (Docker build-arg).
// در توسعه‌ی لوکال که INTERNAL_API_URL ست نشده، به NEXT_PUBLIC_API_URL برمی‌گردد.
const apiBase =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

const nextConfig: NextConfig = {
  experimental: {
    // A 150 MiB gallery video also needs room for multipart headers. Next's
    // default 10 MiB buffer truncates the upload before it reaches NestJS.
    middlewareClientMaxBodySize: '160mb',
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${apiBase}/:path*` },
      { source: '/uploads/:path*', destination: `${apiBase}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
