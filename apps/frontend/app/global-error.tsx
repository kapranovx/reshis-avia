'use client';

// Упал корневой layout вместе со стилями, поэтому стили здесь инлайновые.
export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="ru">
      <head>
        <title>Сайт не открылся</title>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: 'Canvas',
          color: 'CanvasText',
        }}
      >
        <main style={{ maxWidth: '28rem' }}>
          <h1 style={{ margin: 0, fontSize: '26px', letterSpacing: '-0.02em' }}>
            Сайт не открылся
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: '16px', lineHeight: 1.6 }}>
            Это ошибка на нашей стороне. Попробуйте ещё раз.
          </p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                cursor: 'pointer',
                border: '1px solid currentColor',
                borderRadius: '8px',
                padding: '10px 18px',
                font: 'inherit',
                background: 'transparent',
                color: 'inherit',
              }}
            >
              Попробовать снова
            </button>
            {/* Обычная ссылка с полной перезагрузкой: роутеру после падения React доверять нельзя. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{ padding: '10px 18px', color: 'inherit', opacity: 0.7 }}
            >
              На главную
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
