import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import {
  PASSWORD_POLICY,
  type LoginDto as ILoginDto,
} from '@reshis-avia/shared';
import { Trim } from '../../../common/trimmed.decorator';

export class LoginDto implements ILoginDto {
  @ApiProperty({ example: 'anna@example.com' })
  @Trim()
  @IsEmail({}, { message: 'Некорректный адрес почты' })
  email!: string;

  /** Сложность пароля проверяется только при регистрации. */
  @ApiProperty()
  @IsString({ message: 'Укажите пароль' })
  @Length(1, PASSWORD_POLICY.MAX, { message: 'Укажите пароль' })
  password!: string;
}
