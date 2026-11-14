import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

// trim до валидации, иначе @Length(1, ...) пропустит строку из одних пробелов.
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export function TrimmedString(
  min: number,
  max: number,
  message?: string,
): PropertyDecorator {
  return applyDecorators(
    Trim(),
    IsString({ message }),
    Length(min, max, { message }),
  );
}
