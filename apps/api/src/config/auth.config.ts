import { registerAs } from '@nestjs/config';
import { durationToMilliseconds, toBoolean } from './env-utils';

export default registerAs('auth', () => ({
  accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME ?? 'accessToken',
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'refreshToken',
  accessTokenTtlMs: durationToMilliseconds(
    process.env.ACCESS_TOKEN_EXPIRES_IN,
    '1h',
  ),
  refreshTokenTtlMs: durationToMilliseconds(
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN,
    '7d',
  ),
  cookieHttpOnly: toBoolean(process.env.AUTH_COOKIE_HTTP_ONLY, true),
  cookieSameSite:
    process.env.AUTH_COOKIE_SAME_SITE === 'strict' ||
    process.env.AUTH_COOKIE_SAME_SITE === 'none'
      ? process.env.AUTH_COOKIE_SAME_SITE
      : 'lax',
  cookieSecure: toBoolean(
    process.env.AUTH_COOKIE_SECURE,
    process.env.NODE_ENV === 'production',
  ),
  cookiePath: process.env.AUTH_COOKIE_PATH ?? '/',
}));
