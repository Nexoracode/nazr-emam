import { registerAs } from '@nestjs/config';
import { resolve } from 'node:path';
import { toBoolean } from './env-utils';

export default registerAs('media', () => ({
  storage: process.env.MEDIA_STORAGE === 'ftp' ? 'ftp' : 'local',
  uploadDir: resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL ??
    process.env.API_PUBLIC_BASE_URL ??
    'http://localhost:3001',
  ftp: {
    host: process.env.FTP_HOST ?? '',
    port: Number(process.env.FTP_PORT ?? 21),
    user: process.env.FTP_USERNAME ?? process.env.FTP_USER ?? '',
    password: process.env.FTP_PASSWORD ?? '',
    secure: toBoolean(process.env.FTP_SECURE, false),
    uploadDir:
      process.env.MEDIA_FTP_UPLOAD_DIR ?? process.env.FTP_UPLOAD_DIR ?? '/gallery',
    publicBaseUrl:
      process.env.MEDIA_FTP_PUBLIC_BASE_URL ??
      process.env.FTP_PUBLIC_BASE_URL ??
      '',
  },
}));
