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
          slug: 'nazr-royesh',
          title: 'نذر رویش',
          description: 'سفیر نهج‌البلاغه‌ایم برای رویش آگاهی جامعه با پندهای امیرالمؤمنین در قالب‌های متنوع.',
          suggestedAmount: { amount: 300000, currency: 'IRT' },
          isActive: true,
        },
        {
          slug: 'niaz-rooz',
          title: 'نیاز روز',
          description: 'انتخاب اینکه پول من کجا هزینه شود؛ اولویت هر نیاز روز را تیم نذر امام مشخص می‌کند.',
          suggestedAmount: null,
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
