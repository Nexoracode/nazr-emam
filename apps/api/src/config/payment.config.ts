import { registerAs } from '@nestjs/config';
import { toBoolean } from './env-utils';

export default registerAs('payment', () => ({
  gatewayEnabled: toBoolean(process.env.PAYMENT_GATEWAY_ENABLED, false),
  zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID ?? '',
  zarinpalSandbox: toBoolean(process.env.ZARINPAL_SANDBOX, true),
  apiBaseUrl: process.env.API_PUBLIC_BASE_URL ?? 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
}));
