import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Решись Авиа — прогноз продаж',
    template: '%s — Решись Авиа',
  },
  description:
    'Сколько людей захотят купить билет на рейс и сколько купят с учётом мест в самолёте',
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
      className={`${onest.variable} antialiased`}
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
