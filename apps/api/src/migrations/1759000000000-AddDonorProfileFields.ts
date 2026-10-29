import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * فیلدهای پروفایل نذردار + تعهد ماهانه — کاملاً idempotent:
 * اگر ستون‌ها از قبل باشند (مثلاً با synchronize ساخته شده باشند) هیچ کاری
 * نمی‌کند، پس اجرای همزمان با DB_SYNCHRONIZE هم بی‌خطر است.
 */
export class AddDonorProfileFields1759000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ name: string; ddl: string }> = [
      { name: 'donor_first_name', ddl: "`donor_first_name` VARCHAR(80) NULL" },
      { name: 'donor_last_name', ddl: "`donor_last_name` VARCHAR(80) NULL" },
      {
        name: 'donor_gender',
        ddl: "`donor_gender` ENUM('male','female') NULL",
      },
      {
        name: 'is_monthly_fixed',
        ddl: "`is_monthly_fixed` TINYINT(1) NOT NULL DEFAULT 0",
      },
      {
        name: 'wants_monthly_follow_up',
        ddl: "`wants_monthly_follow_up` TINYINT(1) NOT NULL DEFAULT 0",
      },
    ];

    for (const column of columns) {
      const rows: Array<{ c: number }> = await queryRunner.query(
        `SELECT COUNT(*) AS c FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'nazr_requests'
           AND column_name = '${column.name}'`,
      );
      if (Number(rows[0]?.c ?? 0) === 0) {
        await queryRunner.query(
          `ALTER TABLE \`nazr_requests\` ADD COLUMN ${column.ddl}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      'donor_first_name',
      'donor_last_name',
      'donor_gender',
      'is_monthly_fixed',
      'wants_monthly_follow_up',
    ];
    for (const name of names) {
      const rows: Array<{ c: number }> = await queryRunner.query(
        `SELECT COUNT(*) AS c FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'nazr_requests'
           AND column_name = '${name}'`,
      );
      if (Number(rows[0]?.c ?? 0) > 0) {
        await queryRunner.query(
          `ALTER TABLE \`nazr_requests\` DROP COLUMN \`${name}\``,
        );
      }
    }
  }
}
