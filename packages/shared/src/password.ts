// Правила пароля, общие для фронта и бэка.

export const PASSWORD_POLICY = {
  MIN: 8,
  // Ограничение сверху, потому что argon2 хеширует пароль целиком.
  MAX: 200,
} as const;

export type PasswordProblem =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'NEEDS_UPPERCASE'
  | 'NEEDS_LOWERCASE'
  | 'NEEDS_DIGIT'
  | 'TOO_COMMON'
  | 'CONTAINS_PERSONAL';

export const PASSWORD_PROBLEM_MESSAGE: Record<PasswordProblem, string> = {
  TOO_SHORT: `Пароль короче ${PASSWORD_POLICY.MIN} символов`,
  TOO_LONG: `Пароль длиннее ${PASSWORD_POLICY.MAX} символов`,
  NEEDS_UPPERCASE: 'Нужна заглавная буква',
  NEEDS_LOWERCASE: 'Нужна строчная буква',
  NEEDS_DIGIT: 'Нужна цифра',
  TOO_COMMON: 'Такой пароль слишком часто встречается',
  CONTAINS_PERSONAL: 'Пароль не должен повторять имя или почту',
};

const COMMON_PASSWORDS = new Set([
  'password',
  'passw0rd',
  'parol',
  'пароль',
  'qwerty',
  'qwertyui',
  'qwertyuiop',
  'йцукен',
  'йцукенг',
  'asdfgh',
  'zxcvbn',
  'qazwsx',
  '1q2w3e',
  '1q2w3e4r',
  '1q2w3e4r5t',
  'q1w2e3r4',
  'abc',
  'abcd',
  'abcdef',
  'abcdefg',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'iloveyou',
  'admin',
  'administrator',
  'root',
  'user',
  'guest',
  'login',
  'test',
  'demo',
  'secret',
  'master',
  'sunshine',
  'princess',
  'superman',
  'batman',
  'trustno',
  'whatever',
  'freedom',
  'starwars',
  'computer',
  'internet',
  'samsung',
  'google',
  'facebook',
  'nikita',
  'natasha',
  'marina',
  'sergey',
  'andrey',
  'alexander',
  'aleksandr',
  'dmitry',
  'maxim',
  'lyubov',
  'ljubov',
  'privet',
  'привет',
  'liverpool',
  'spartak',
  'zenit',
  'dinamo',
  'rossiya',
  'russia',
  'moskva',
  'moscow',
  'changeme',
  'temporary',
  'temppassword',
  'newpassword',
  'mypassword',
]);

function isSingleCharacter(value: string): boolean {
  return value.length > 0 && new Set(value).size === 1;
}

function isAllDigits(value: string): boolean {
  return value.length > 0 && /^\p{Nd}+$/u.test(value);
}

// abcdefgh, 87654321 и т.п.
function isSequential(value: string): boolean {
  if (value.length < 4) return false;
  const step = value.charCodeAt(1) - value.charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  for (let i = 2; i < value.length; i += 1) {
    if (value.charCodeAt(i) - value.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

function unleet(value: string): string {
  return value
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't');
}

// Проверяем несколько вариантов: P@ssw0rd! ловится после замены символов,
// Qwerty123! после отрезания хвоста.
function candidateForms(value: string): string[] {
  const lower = value.toLowerCase();
  const withoutTail = lower.replace(/[^\p{L}]+$/u, '');
  const core = withoutTail.replace(/^[^\p{L}]+/u, '');

  const forms = new Set([lower, withoutTail, core]);
  for (const form of Array.from(forms)) forms.add(unleet(form));
  return Array.from(forms).filter((form) => form.length > 0);
}

// Части имени и email от 4 символов, более короткие совпадают случайно.
export function personalHints(input: {
  email?: string | null;
  name?: string | null;
}): string[] {
  const parts: string[] = [];
  const local = input.email?.split('@')[0] ?? '';
  parts.push(...local.split(/[^\p{L}\p{N}]+/u));
  parts.push(...(input.name ?? '').split(/[^\p{L}\p{N}]+/u));
  return parts
    .map((part) => part.toLowerCase())
    .filter((part) => part.length >= 4);
}

export function checkPassword(
  password: string,
  personal: string[] = [],
): PasswordProblem[] {
  const problems: PasswordProblem[] = [];

  if (password.length < PASSWORD_POLICY.MIN) problems.push('TOO_SHORT');
  if (password.length > PASSWORD_POLICY.MAX) problems.push('TOO_LONG');

  // Юникодные классы, чтобы кириллица тоже считалась.
  if (!/\p{Lu}/u.test(password)) problems.push('NEEDS_UPPERCASE');
  if (!/\p{Ll}/u.test(password)) problems.push('NEEDS_LOWERCASE');
  if (!/\p{Nd}/u.test(password)) problems.push('NEEDS_DIGIT');

  if (
    candidateForms(password).some((form) => COMMON_PASSWORDS.has(form)) ||
    isSingleCharacter(password) ||
    isAllDigits(password) ||
    isSequential(password)
  ) {
    problems.push('TOO_COMMON');
  }

  const lowered = password.toLowerCase();
  if (personal.some((hint) => lowered.includes(hint))) {
    problems.push('CONTAINS_PERSONAL');
  }

  return problems;
}

export interface PasswordRuleState {
  id: 'length' | 'uppercase' | 'lowercase' | 'digit' | 'unique';
  label: string;
  ok: boolean;
}

// Список правил для подсказки под полем.
export function passwordRules(
  password: string,
  personal: string[] = [],
): PasswordRuleState[] {
  const problems = checkPassword(password, personal);
  const has = (problem: PasswordProblem) => problems.includes(problem);

  return [
    {
      id: 'length',
      label: `Минимум ${PASSWORD_POLICY.MIN} символов`,
      ok: !has('TOO_SHORT') && !has('TOO_LONG'),
    },
    {
      id: 'uppercase',
      label: 'Заглавная буква',
      ok: !has('NEEDS_UPPERCASE'),
    },
    {
      id: 'lowercase',
      label: 'Строчная буква',
      ok: !has('NEEDS_LOWERCASE'),
    },
    {
      id: 'digit',
      label: 'Цифра',
      ok: !has('NEEDS_DIGIT'),
    },
    {
      id: 'unique',
      label: 'Не частый пароль и не ваши имя или почта',
      ok: !has('TOO_COMMON') && !has('CONTAINS_PERSONAL'),
    },
  ];
}
