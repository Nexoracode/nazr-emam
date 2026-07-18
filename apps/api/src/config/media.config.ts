import { registerAs } from '@nestjs/config';
import { resolve } from 'node:path';

export default registerAs('media', () => ({
  uploadDir: resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL ??
    process.env.API_PUBLIC_BASE_URL ??
    'http://localhost:3001',
}));
