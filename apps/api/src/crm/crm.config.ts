import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * تنظیمات اتصال به CRM24 (vtiger). اگر CRM_BASE_URL خالی باشد ماژول غیرفعال است.
 */
export interface CrmConfig {
  baseUrl: string;
  username: string;
  accessKey: string;
  assignedUserId: string;
  timeoutMs: number;
}

export function getCrmConfigFromEnv(): CrmConfig | null {
  const baseUrl = process.env.CRM_BASE_URL?.trim() || '';
  const username = process.env.CRM_USERNAME?.trim() || '';
  const accessKey = process.env.CRM_ACCESS_KEY?.trim() || '';
  // ارجاع پیش‌فرض: احمد گوهری اقدم
  const assignedUserId = process.env.CRM_ASSIGNED_USER_ID?.trim() || '19x27';
  const timeoutMs = Number(process.env.CRM_TIMEOUT_MS ?? 15000);
  if (!baseUrl || !username || !accessKey) {
    return null;
  }
  return { baseUrl, username, accessKey, assignedUserId, timeoutMs };
}

@Injectable()
export class CrmConfigService {
  private readonly logger = new Logger(CrmConfigService.name);
  private cached: CrmConfig | null | undefined;

  get config(): CrmConfig | null {
    if (this.cached === undefined) {
      this.cached = getCrmConfigFromEnv();
      if (!this.cached) {
        this.logger.log('CRM24 غیرفعال است — CRM_BASE_URL تنظیم نشده است.');
      }
    }
    return this.cached;
  }

  get enabled(): boolean {
    return this.config !== null;
  }
}
