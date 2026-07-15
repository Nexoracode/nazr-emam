import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type {
  CreateNotificationRequest,
  NotificationItem,
  Paginated,
} from '@nazr-emam/shared';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async getMine(userId: string, page = 1, pageSize = 12): Promise<Paginated<NotificationItem>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 12));
    const [items, total] = await this.repo.findAndCount({
      where: [{ userId }, { userId: IsNull() }],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });
    return {
      items: items.map((item) => this.toDto(item)),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize),
    };
  }

  async create(payload: CreateNotificationRequest): Promise<NotificationItem> {
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    const fields: Record<string, string> = {};
    if (!title || title.length < 2 || title.length > 180) {
      fields.title = 'عنوان اعلان معتبر نیست';
    }
    if (!body || body.length < 2 || body.length > 4000) {
      fields.body = 'متن اعلان معتبر نیست';
    }
    if (Object.keys(fields).length) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'ورودی نامعتبر است',
        fields,
      });
    }
    const notification = await this.repo.save(
      this.repo.create({
        userId: payload.userId ?? null,
        title,
        body,
        link: payload.link?.trim() || null,
        isRead: false,
      }),
    );
    return this.toDto(notification);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'اعلان پیدا نشد',
      });
    }
    if (notification.userId && notification.userId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'شما به این اعلان دسترسی ندارید',
      });
    }
    notification.isRead = true;
    await this.repo.save(notification);
  }

  private toDto(notification: NotificationEntity): NotificationItem {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
