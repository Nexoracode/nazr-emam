import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://api.iranpayamak.com/ws/v1/sms/pattern';
  private readonly apiKey = process.env.FARAZ_SMS_API_KEY;
  private readonly fromNumber = process.env.FARAZ_SMS_ORIGINATOR;

  async sendOtp(mobile: string, code: string): Promise<void> {
    const body = JSON.stringify({
      code: 'zBHGCbzvQO',
      line_number: this.fromNumber,
      number_format: 'english',
      recipient: mobile,
      attributes: {
        verificationcode: code,
        name: mobile,
      },
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Api-Key': this.apiKey ?? '',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.error(`❌ OTP SMS failed (${response.status}): ${text}`);
        throw new Error('ارسال پیامک با خطا مواجه شد.');
      }

      this.logger.log(`✅ OTP sent to ${mobile} — status: ${response.status}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`❌ OTP SMS timeout for ${mobile}`);
        throw new Error('ارسال پیامک با خطا مواجه شد.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
