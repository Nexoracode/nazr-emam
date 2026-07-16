import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletEntity } from './entities/wallet.entity';

const PROCESS_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class WalletMonthlyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletMonthlyService.name);
  private initialTimer?: ReturnType<typeof setTimeout>;
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletsRepo: Repository<WalletEntity>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.initialTimer = setTimeout(() => void this.processDueDeductions(), 10_000);
    this.initialTimer.unref();
    this.interval = setInterval(
      () => void this.processDueDeductions(),
      PROCESS_INTERVAL_MS,
    );
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.initialTimer) clearTimeout(this.initialTimer);
    if (this.interval) clearInterval(this.interval);
  }

  async processDueDeductions(now = new Date()): Promise<number> {
    const dueWallets = await this.walletsRepo.find({
      where: {
        isMonthlyDeductionEnabled: true,
        nextMonthlyDeductionAt: LessThanOrEqual(now),
      },
    });
    let processed = 0;

    for (const dueWallet of dueWallets) {
      try {
        const deducted = await this.processWallet(dueWallet.id, now);
        if (deducted) processed += 1;
      } catch (error) {
        this.logger.error(
          `Monthly wallet deduction failed for wallet ${dueWallet.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return processed;
  }

  private processWallet(walletId: string, now: Date): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity);
      const transactionRepo = manager.getRepository(WalletTransactionEntity);
      const wallet = await walletRepo.findOne({
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      const amount = wallet?.monthlyDeductionAmount;
      if (
        !wallet ||
        !wallet.isMonthlyDeductionEnabled ||
        !wallet.nextMonthlyDeductionAt ||
        wallet.nextMonthlyDeductionAt.getTime() > now.getTime() ||
        !amount ||
        amount.amount <= 0 ||
        wallet.balance.currency !== amount.currency ||
        wallet.balance.amount < amount.amount
      ) {
        return false;
      }

      wallet.balance = {
        amount: wallet.balance.amount - amount.amount,
        currency: wallet.balance.currency,
      };
      wallet.lastMonthlyDeductionAt = now;
      wallet.nextMonthlyDeductionAt = this.addOneMonth(now);
      await walletRepo.save(wallet);
      await transactionRepo.save(
        transactionRepo.create({
          walletId: wallet.id,
          wallet,
          type: 'deduction',
          status: 'completed',
          amount,
          description: 'برداشت خودکار ماهانه',
          gatewayAuthority: null,
          transactionReference: null,
        }),
      );
      return true;
    });
  }

  private addOneMonth(value: Date): Date {
    const result = new Date(value);
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + 1);
    const lastDay = new Date(
      Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
    ).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }
}
