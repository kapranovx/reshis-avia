import { checkPassword, personalHints } from '@reshis-avia/shared';

describe('checkPassword', () => {
  it('пропускает пароль со всеми требованиями', () => {
    expect(checkPassword('Gorod7veter')).toEqual([]);
  });

  it('пропускает кириллический пароль: регистр смотрится по Юникоду', () => {
    expect(checkPassword('Городветер7')).toEqual([]);
  });

  it('требует заглавную букву', () => {
    expect(checkPassword('gorod7veter')).toContain('NEEDS_UPPERCASE');
  });

  it('требует строчную букву', () => {
    expect(checkPassword('GOROD7VETER')).toContain('NEEDS_LOWERCASE');
  });

  it('требует цифру', () => {
    expect(checkPassword('GorodVeter')).toContain('NEEDS_DIGIT');
  });

  it('не пропускает короткий пароль', () => {
    expect(checkPassword('Ab3cd')).toContain('TOO_SHORT');
  });

  it('не пропускает слишком длинный пароль', () => {
    expect(checkPassword(`Aa1${'x'.repeat(300)}`)).toContain('TOO_LONG');
  });

  it('не пропускает частый пароль, замаскированный заменой букв', () => {
    expect(checkPassword('P@ssw0rd!')).toContain('TOO_COMMON');
    expect(checkPassword('Qwerty123!')).toContain('TOO_COMMON');
    expect(checkPassword('Пароль2026')).toContain('TOO_COMMON');
  });

  it('не пропускает повтор одного символа и подряд идущие символы', () => {
    expect(checkPassword('Aaaaaaaaaaa1')).not.toContain('TOO_SHORT');
    expect(checkPassword('1234567890')).toContain('TOO_COMMON');
    expect(checkPassword('abcdefghijkl')).toContain('TOO_COMMON');
  });

  it('не пропускает пароль с именем или почтой владельца', () => {
    const personal = personalHints({
      email: 'smirnova@example.com',
      name: 'Анна Смирнова',
    });
    expect(checkPassword('Smirnova2026', personal)).toContain(
      'CONTAINS_PERSONAL',
    );
    expect(checkPassword('Смирнова2026', personal)).toContain(
      'CONTAINS_PERSONAL',
    );
    expect(checkPassword('Gorod7veter', personal)).toEqual([]);
  });

  it('не цепляется к коротким совпадениям в имени', () => {
    const personal = personalHints({ email: 'yan@example.com', name: 'Ян' });
    expect(personal).toEqual([]);
  });

  it('возвращает все нарушения сразу, а не первое', () => {
    const problems = checkPassword('abc', personalHints({ name: 'abcdef' }));
    expect(problems).toContain('TOO_SHORT');
    expect(problems).toContain('NEEDS_UPPERCASE');
    expect(problems).toContain('NEEDS_DIGIT');
  });
});
