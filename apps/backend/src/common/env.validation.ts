interface EnvRule {
  key: string;
  required: 'always' | 'production';
  check?: (value: string) => string | null;
  hint?: string;
}

const RULES: EnvRule[] = [
  {
    key: 'DATABASE_URL',
    required: 'always',
    check: (v) =>
      v.startsWith('postgresql://') || v.startsWith('postgres://')
        ? null
        : 'должна начинаться с postgresql://',
  },
  {
    key: 'REDIS_URL',
    required: 'always',
    check: (v) =>
      v.startsWith('redis://') ? null : 'должна начинаться с redis://',
  },
  {
    key: 'CORS_ORIGIN',
    required: 'production',
    hint: 'адрес сайта, несколько через запятую',
  },
  {
    key: 'TRUST_PROXY_HOPS',
    required: 'production',
    hint: '0 без прокси, 1 за Caddy',
    check: (v) =>
      /^\d+$/.test(v)
        ? null
        : 'целое число: от него зависит, по чьему IP считаются лимиты',
  },
];

export function validateEnv(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const isProd = raw.NODE_ENV === 'production';
  const problems: string[] = [];

  for (const rule of RULES) {
    const value = raw[rule.key];
    const present = typeof value === 'string' && value.trim() !== '';

    if (!present) {
      if (rule.required === 'always' || isProd) {
        problems.push(
          `${rule.key} не задана${rule.hint ? ` (${rule.hint})` : ''}`,
        );
      }
      continue;
    }

    const problem = rule.check?.(value);
    if (problem) problems.push(`${rule.key}: ${problem}`);
  }

  if (problems.length > 0) {
    throw new Error(
      `Некорректная конфигурация окружения:\n  - ${problems.join('\n  - ')}\n` +
        'Смотри apps/backend/.env.example',
    );
  }

  return raw;
}
