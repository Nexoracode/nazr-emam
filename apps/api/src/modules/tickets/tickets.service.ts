import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import type {
  CreateTicketRequest,
  Paginated,
  Ticket,
  TicketMessage,
  User,
} from '@nazr-emam/shared';
import { isValidIranMobile } from '@nazr-emam/shared';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { TicketMessageEntity } from './entities/ticket-message.entity';
import { TicketEntity } from './entities/ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketsRepo: Repository<TicketEntity>,
    @InjectRepository(TicketMessageEntity)
    private readonly messagesRepo: Repository<TicketMessageEntity>,
    @InjectRepository(NazrRequestEntity)
    private readonly nazrRequestsRepo: Repository<NazrRequestEntity>,
  ) {}

  async create(payload: CreateTicketRequest, user?: User): Promise<Ticket> {
    const subject = payload.subject?.trim();
    const body = payload.body?.trim();
    const fields: Record<string, string> = {};
    if (!subject || subject.length < 3 || subject.length > 180) {
      fields.subject = 'موضوع تیکت معتبر نیست';
    }
    if (!body || body.length < 3 || body.length > 4000) {
      fields.body = 'متن تیکت معتبر نیست';
    }
    const guestMobile = payload.guestMobile?.trim() || null;
    if (!user && !isValidIranMobile(guestMobile)) {
      fields.guestMobile = 'شماره همراه مهمان معتبر نیست';
    }
    this.throwValidation(fields);

    const nazrRequest = payload.nazrRequestTrackingCode
      ? await this.nazrRequestsRepo.findOne({
          where: { trackingCode: payload.nazrRequestTrackingCode.trim() },
        })
      : null;
    const ticket = await this.ticketsRepo.save(
      this.ticketsRepo.create({
        userId: user?.id ?? null,
        guestMobile,
        subject,
        status: 'open',
        nazrRequestId: nazrRequest?.id ?? null,
      }),
    );
    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        ticketId: ticket.id,
        ticket,
        body,
        authorType: 'user',
      }),
    );
    ticket.messages = [message];
    return this.toDto(ticket);
  }

  async getMine(userId: string, page = 1, pageSize = 12): Promise<Paginated<Ticket>> {
    return this.getPaginated({ userId }, page, pageSize);
  }

  async getAll(page = 1, pageSize = 20): Promise<Paginated<Ticket>> {
    return this.getPaginated({}, page, pageSize);
  }

  async reply(id: string, body: string, user: User): Promise<TicketMessage> {
    const ticket = await this.getTicketOrFail(id);
    if (user.role !== 'admin' && ticket.userId !== user.id) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'شما به این تیکت دسترسی ندارید',
      });
    }
    const text = body?.trim();
    if (!text || text.length < 2 || text.length > 4000) {
      this.throwValidation({ body: 'متن پاسخ معتبر نیست' });
    }
    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        ticketId: ticket.id,
        ticket,
        body: text,
        authorType: user.role === 'admin' ? 'support' : 'user',
      }),
    );
    ticket.status = user.role === 'admin' ? 'answered' : 'open';
    await this.ticketsRepo.save(ticket);
    return this.toMessageDto(message);
  }

  async close(id: string, user: User): Promise<void> {
    const ticket = await this.getTicketOrFail(id);
    if (user.role !== 'admin' && ticket.userId !== user.id) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'شما به این تیکت دسترسی ندارید',
      });
    }
    ticket.status = 'closed';
    await this.ticketsRepo.save(ticket);
  }

  private async getPaginated(
    where: FindOptionsWhere<TicketEntity>,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Ticket>> {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 12));
    const [items, total] = await this.ticketsRepo.findAndCount({
      where,
      relations: { messages: true },
      order: { updatedAt: 'DESC', messages: { createdAt: 'ASC' } },
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

  private async getTicketOrFail(id: string): Promise<TicketEntity> {
    const ticket = await this.ticketsRepo.findOne({
      where: { id },
      relations: { messages: true },
    });
    if (!ticket) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'TICKET_NOT_FOUND',
        message: 'تیکت پیدا نشد',
      });
    }
    return ticket;
  }

  private toDto(ticket: TicketEntity): Ticket {
    return {
      id: ticket.id,
      userId: ticket.userId,
      guestMobile: ticket.guestMobile,
      subject: ticket.subject,
      status: ticket.status,
      nazrRequestId: ticket.nazrRequestId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: [...(ticket.messages ?? [])]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((message) => this.toMessageDto(message)),
    };
  }

  private toMessageDto(message: TicketMessageEntity): TicketMessage {
    return {
      id: message.id,
      body: message.body,
      authorType: message.authorType,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private throwValidation(fields: Record<string, string>): void {
    if (Object.keys(fields).length === 0) return;
    throw new BadRequestException({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'ورودی نامعتبر است',
      fields,
    });
  }
}
