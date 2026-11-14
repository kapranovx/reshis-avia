import { checkPassword, personalHints } from '@reshis-avia/shared';

describe('checkPassword', () => {
  it('пропускает обычный пароль от 8 символов', () => {
    expect(checkPassword('Gorod7veter')).toEqual([]);
  });

  it('не требует заглавных букв и цифр', () => {
    expect(checkPassword('gorodveter')).toEqual([]);
    expect(checkPassword('городветер')).toEqual([]);
    expect(checkPassword('krylo samoleta')).toEqual([]);
  });

  it('не пропускает короткий пароль', () => {
    expect(checkPassword('Ab3cdef')).toContain('TOO_SHORT');
    expect(checkPassword('Ab3cdefg')).not.toContain('TOO_SHORT');
  });

  it('не пропускает слишком длинный пароль', () => {
    expect(checkPassword(`Aa1${'x'.repeat(300)}`)).toContain('TOO_LONG');
  });

  it('не пропускает частый пароль, замаскированный заменой букв', () => {
    expect(checkPassword('P@ssw0rd!')).toContain('TOO_COMMON');
    expect(checkPassword('Qwerty123!')).toContain('TOO_COMMON');
    expect(checkPassword('Пароль2026')).toContain('TOO_COMMON');
  });

  it('не пропускает повтор одного символа, одни цифры и подряд идущие символы', () => {
    expect(checkPassword('aaaaaaaaaa')).toContain('TOO_COMMON');
    expect(checkPassword('1234567890')).toContain('TOO_COMMON');
    expect(checkPassword('20261115')).toContain('TOO_COMMON');
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
    const problems = checkPassword('qwerty', personalHints({ name: 'qwerty' }));
    expect(problems).toEqual(['TOO_SHORT', 'TOO_COMMON', 'CONTAINS_PERSONAL']);
  });
});
