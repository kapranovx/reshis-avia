import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import {
  LIMITS,
  PASSWORD_POLICY,
  type SignupDto as ISignupDto,
} from '@reshis-avia/shared';
import { Trim, TrimmedString } from '../../../common/trimmed.decorator';
import { IsStrongPassword } from '../../../common/validators/strong-password.validator';

export class SignupDto implements ISignupDto {
  @ApiProperty({ example: 'Анна' })
  @TrimmedString(
    1,
    LIMITS.NAME_MAX,
    `Укажите имя, до ${LIMITS.NAME_MAX} символов`,
  )
  name!: string;

  @ApiProperty({ example: 'anna@example.com' })
  @Trim()
  @IsEmail({}, { message: 'Некорректный адрес почты' })
  @MaxLength(LIMITS.EMAIL_MAX, { message: 'Слишком длинный адрес почты' })
  email!: string;

  @ApiProperty({ minLength: PASSWORD_POLICY.MIN })
  @IsString({ message: 'Укажите пароль' })
  @IsStrongPassword()
  password!: string;
}
