import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { NazrType } from '@nazr-emam/shared';
import { Repository } from 'typeorm';
import { NazrTypeEntity } from './entities/nazr-type.entity';

@Injectable()
export class NazrTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(NazrTypeEntity)
    private readonly repo: Repository<NazrTypeEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.repo.count();
    if (count > 0) {
      return;
    }

    await this.repo.save(
      this.repo.create([
        {
          slug: 'international',
          title: 'بین‌الملل',
          description: 'بیداری کشورها با کلام امیرالمومنین و گسترش پیام نهج البلاغه در جهان تشنه حقیقت.',
          suggestedAmount: { amount: 500000, currency: 'IRT' },
          isActive: true,
        },
        {
          slug: 'circulating-waqf',
          title: 'وقف در گردش',
          description: 'وقف محتوای آموزشی و ساخت چرخه بی نهایت اثرگذاری در ذهن نوجوانان مناطق محروم.',
          suggestedAmount: { amount: 300000, currency: 'IRT' },
          isActive: true,
        },
        {
          slug: 'nahj-lesson',
          title: 'درس‌نامه نهج‌البلاغه نوجوان',
          description: 'حمایت از تولید و توزیع درس‌نامه‌های نهج‌البلاغه برای نوجوانان و معلمان فعال.',
          suggestedAmount: { amount: 250000, currency: 'IRT' },
          isActive: true,
        },
        {
          slug: 'free-box',
          title: 'باکس آزاد',
          description: 'مشارکت آزاد برای هزینه‌های ضروری و اولویت‌دار طرح نذر امام.',
          suggestedAmount: null,
          isActive: true,
        },
        {
          slug: 'support-team',
          title: 'تیم پاسخگویی',
          description: 'حمایت از تیم پاسخگویی، ارتباط با مخاطبان و پیگیری‌های فرهنگی طرح.',
          suggestedAmount: { amount: 200000, currency: 'IRT' },
          isActive: true,
        },
      ]),
    );
  }

  async findActive(): Promise<NazrType[]> {
    const items = await this.repo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    return items.map((item) => this.toDto(item));
  }

  private toDto(item: NazrTypeEntity): NazrType {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: item.description,
      suggestedAmount: item.suggestedAmount,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
