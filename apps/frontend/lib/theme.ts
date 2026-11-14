export const THEME_CHOICES = ['light', 'dark', 'system'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_STORAGE_KEY = 'reshis-avia-theme';

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Как в системе',
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    typeof value === 'string' &&
    (THEME_CHOICES as readonly string[]).includes(value)
  );
}

// system означает отсутствие атрибута, тогда тему выбирает медиазапрос в CSS.
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // localStorage недоступен, тема продержится до перезагрузки.
  }
}

// Тема хранится вне React (localStorage, другие вкладки), поэтому useSyncExternalStore.
const listeners = new Set<() => void>();

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function themeServerSnapshot(): ThemeChoice {
  return 'system';
}

export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  storeTheme(choice);
  for (const listener of listeners) listener();
}

// Выставляет тему до первой отрисовки, чтобы не было вспышки светлой темы.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var v = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (v === 'light' || v === 'dark') {
      document.documentElement.setAttribute('data-theme', v);
    }
  } catch (e) {}
})();
`;
