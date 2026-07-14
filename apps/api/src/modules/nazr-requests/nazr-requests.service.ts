import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NazrRequest, NazrType, Paginated } from '@nazr-emam/shared';
import { NazrRequestEntity } from './entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';

@Injectable()
export class NazrRequestsService {
  constructor(
    @InjectRepository(NazrRequestEntity)
    private readonly repo: Repository<NazrRequestEntity>,
  ) {}

  async getMine(
    userId: string,
    page = 1,
    pageSize = 12,
  ): Promise<Paginated<NazrRequest>> {
    const [items, total] = await this.repo.findAndCount({
      where: { userId },
      relations: { nazrType: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((r) => this.toDto(r)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private toDto(r: NazrRequestEntity): NazrRequest {
    return {
      id: r.id,
      trackingCode: r.trackingCode,
      userId: r.userId,
      nazrType: this.toNazrTypeDto(r.nazrType),
      donorFullName: r.donorFullName,
      donorMobile: r.donorMobile,
      donorNationalCode: r.donorNationalCode,
      amount: r.amount,
      note: r.note,
      isAnonymous: r.isAnonymous,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toNazrTypeDto(t: NazrTypeEntity): NazrType {
    return {
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      suggestedAmount: t.suggestedAmount,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
