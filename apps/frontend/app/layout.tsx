import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'reshis-avia',
    template: '%s · reshis-avia',
  },
  description: 'Прогноз продаж авиабилетов',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#101114' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${manrope.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Тема до первой отрисовки, чтобы страница не мигала светлой. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
