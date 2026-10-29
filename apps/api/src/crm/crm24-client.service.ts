import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CrmConfigService } from './crm.config';

/**
 * کلاینت وب‌سرویس CRM24 (vtiger) — همان پروتکل گیت‌وی سپیدارِ موجود:
 * challenge → md5(token+accessKey) → sessionName؛ همه عملیات با sessionName.
 * ورود تنبل است و نشست پس از انقضا یک‌بار تمدید می‌شود.
 */
@Injectable()
export class Crm24ClientService {
  private readonly logger = new Logger(Crm24ClientService.name);
  private sessionName: string | null = null;

  constructor(private readonly crmConfig: CrmConfigService) {}

  private async send<T = Record<string, unknown>>(
    params: Record<string, string>,
    retryOnAuth = true,
  ): Promise<T> {
    const config = this.crmConfig.config;
    if (!config) throw new Error('CRM24 غیرفعال است');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
        signal: controller.signal,
      });
      const json = (await response.json()) as {
        success: boolean;
        result?: T;
        message?: string;
        error?: { message?: string };
      };
      if (!json.success) {
        const message = json.error?.message ?? json.message ?? 'unknown CRM error';
        // نشست منقضی شده — یک‌بار تمدید و تلاش مجدد.
        if (/session|auth/i.test(message) && retryOnAuth) {
          this.sessionName = null;
          await this.login();
          return this.send({ ...params, sessionName: this.sessionName! }, false);
        }
        throw new Error(`CRM24: ${message}`);
      }
      return json.result as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async login(): Promise<void> {
    if (this.sessionName) return;
    const config = this.crmConfig.config;
    if (!config) throw new Error('CRM24 غیرفعال است');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const challengeUrl =
        `${config.baseUrl}?operation=getchallenge&username=${encodeURIComponent(config.username)}`;
      const challengeResponse = await fetch(challengeUrl, { signal: controller.signal });
      const challenge = (await challengeResponse.json()) as {
        success: boolean;
        result?: { token?: string };
        message?: string;
      };
      if (!challenge.success || !challenge.result?.token) {
        throw new Error(`CRM24 challenge ناموفق: ${challenge.message ?? 'no token'}`);
      }
      const accessKey = createHash('md5')
        .update(challenge.result.token + config.accessKey)
        .digest('hex');
      const login = await this.send<{ sessionName?: string }>(
        {
          operation: 'login',
          username: config.username,
          accessKey,
        },
        false,
      );
      if (!login.sessionName) throw new Error('CRM24 login پاسخ sessionName نداشت');
      this.sessionName = login.sessionName;
      this.logger.log('ورود به CRM24 موفق بود');
    } finally {
      clearTimeout(timer);
    }
  }

  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    await this.login();
    return this.send<T[]>({ operation: 'query', sessionName: this.sessionName!, query: sql });
  }

  async create<T = Record<string, unknown>>(
    module: string,
    element: Record<string, unknown>,
  ): Promise<T> {
    await this.login();
    return this.send<T>({
      operation: 'create',
      sessionName: this.sessionName!,
      elementType: module,
      element: JSON.stringify(element),
    });
  }

  /** به‌روزرسانی رکورد موجود؛ element باید id رکورد را داشته باشد. */
  async update<T = Record<string, unknown>>(
    module: string,
    element: { id: string } & Record<string, unknown>,
  ): Promise<T> {
    await this.login();
    return this.send<T>({
      operation: 'update',
      sessionName: this.sessionName!,
      elementType: module,
      element: JSON.stringify(element),
    });
  }
}
