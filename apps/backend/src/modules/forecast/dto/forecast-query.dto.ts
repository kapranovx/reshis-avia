import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
} from 'class-validator';
import type { ForecastQuery } from '@reshis-avia/shared';

const toCityCode = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const CITY_CODE = /^[A-Z]{3}$/;

export class ForecastQueryDto implements ForecastQuery {
  @ApiProperty({ example: 'MOW' })
  @Transform(toCityCode)
  @Matches(CITY_CODE, {
    message: 'Код города из трёх латинских букв, например MOW',
  })
  @IsString({ message: 'Укажите город отправления' })
  origin!: string;

  @ApiProperty({ example: 'AER' })
  @Transform(toCityCode)
  @Matches(CITY_CODE, {
    message: 'Код города из трёх латинских букв, например AER',
  })
  @IsString({ message: 'Укажите город назначения' })
  destination!: string;

  // class-validator проверяет снизу вверх, а наружу уходит первое сообщение,
  // поэтому проверка формата стоит ниже проверки значения.
  @ApiProperty({ example: '2026-06-15' })
  @IsISO8601({ strict: true }, { message: 'Такой даты нет в календаре' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Дата в формате ГГГГ-ММ-ДД' })
  @IsString({ message: 'Укажите дату вылета' })
  date!: string;

  @ApiProperty({ example: 9000, description: 'Цена билета, ₽' })
  @Type(() => Number)
  @IsPositive({ message: 'Цена должна быть больше нуля' })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'Укажите цену числом' },
  )
  price!: number;
}
