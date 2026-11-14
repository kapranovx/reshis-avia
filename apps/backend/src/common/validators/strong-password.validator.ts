import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  checkPassword,
  PASSWORD_PROBLEM_MESSAGE,
  personalHints,
} from '@reshis-avia/shared';

// Правила общие с фронтом. Имя и email для сравнения берём из того же DTO.
@ValidatorConstraint({ name: 'strongPassword', async: false })
export class StrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;
    return checkPassword(value, hintsFor(args)).length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = typeof args.value === 'string' ? args.value : '';
    const [problem] = checkPassword(value, hintsFor(args));
    return problem
      ? PASSWORD_PROBLEM_MESSAGE[problem]
      : 'Пароль не подходит по правилам';
  }
}

function hintsFor(args: ValidationArguments): string[] {
  const object = args.object as { email?: unknown; name?: unknown };
  return personalHints({
    email: typeof object.email === 'string' ? object.email : null,
    name: typeof object.name === 'string' ? object.name : null,
  });
}

export function IsStrongPassword(options?: ValidationOptions) {
  return function decorate(target: object, propertyName: string): void {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options,
      constraints: [],
      validator: StrongPasswordConstraint,
    });
  };
}
