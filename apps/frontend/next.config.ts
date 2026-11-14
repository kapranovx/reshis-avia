import path from 'node:path';
import type { NextConfig } from 'next';

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const API_ORIGIN = originOf(process.env.NEXT_PUBLIC_API_URL);
const isDev = process.env.NODE_ENV !== 'production';

// Сеть только к себе и к API. unsafe-eval нужен только в dev для HMR.
function contentSecurityPolicy(): string {
  const self = "'self'";
  return [
    `default-src ${self}`,
    `script-src ${self} 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src ${self} 'unsafe-inline'`,
    `img-src ${self} data: blob:`,
    `font-src ${self} data:`,
    [`connect-src ${self}`, API_ORIGIN, isDev ? 'ws:' : null]
      .filter(Boolean)
      .join(' '),
    "frame-src 'none'",
    "object-src 'none'",
    `base-uri ${self}`,
    `form-action ${self}`,
    "frame-ancestors 'none'",
  ].join('; ');
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  // Корень монорепы, иначе Turbopack не видит общий node_modules.
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
  // Самодостаточная сборка для Docker-образа.
  output: 'standalone',
  poweredByHeader: false,
  headers: () =>
    Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
};

export default nextConfig;
