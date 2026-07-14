import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { toBoolean, toNumber } from './env-utils';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: toNumber(process.env.DB_PORT, 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'tehran1500@$@',
    database: process.env.DB_DATABASE ?? 'nazr',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: toBoolean(process.env.DB_SYNCHRONIZE, false),
    logging: toBoolean(process.env.DB_LOGGING, false),
  }),
);
