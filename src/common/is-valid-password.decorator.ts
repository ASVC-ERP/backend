import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

// Shared password policy for user create / update (#7).
// Deliberately light: length + "a letter and a digit". No forced symbols
// or mixed case -- those mostly produce predictable patterns and support
// tickets without much real-world entropy gain.
//
// 72 is the bcrypt input limit; bytes past it are silently ignored, so a
// longer password is a false sense of security -- reject it outright.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export function IsValidPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN, {
      message: `password must be at least ${PASSWORD_MIN} characters`,
    }),
    MaxLength(PASSWORD_MAX, {
      message: `password must be at most ${PASSWORD_MAX} characters`,
    }),
    Matches(/[A-Za-z]/, { message: 'password must contain a letter' }),
    Matches(/\d/, { message: 'password must contain a digit' }),
  );
}
