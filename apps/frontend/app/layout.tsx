import type { Metadata, Viewport } from 'next';
import { Fira_Sans, Fira_Sans_Extra_Condensed } from 'next/font/google';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

// Fira Sans из шрифтовой линии навигационных систем: текст интерфейса.
// Узкое начертание: коды аэропортов, табло и крупные числа.
const fira = Fira_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-fira',
  display: 'swap',
});

const firaExtraCondensed = Fira_Sans_Extra_Condensed({
  weight: ['500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-fira-xc',
  display: 'swap',
});

const TITLE = 'Решись Авиа — прогноз продаж';
const DESCRIPTION =
  'Сколько людей захотят купить билет на рейс и сколько купят с учётом мест в самолёте';

// Адрес сайта берём из адреса API, который и так задаётся при сборке:
// https://avia.aexd.ru/api/v1 → https://avia.aexd.ru. Он нужен, чтобы ссылка
// на картинку превью (app/opengraph-image.png) была абсолютной.
const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3500',
).origin;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — Решись Авиа',
  },
  description: DESCRIPTION,
  // Картинка превью — снимок главной 1200x630. Если главная заметно
  // изменится, её стоит переснять.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Решись Авиа',
    locale: 'ru_RU',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e2e5e7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f11' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${fira.variable} ${firaExtraCondensed.variable} antialiased`}
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
