import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    apiId: parseInt(process.env.TG_API_ID ?? '0', 10),
    apiHash: process.env.TG_API_HASH ?? '',
    phone: process.env.TG_PHONE ?? '',
    channel: process.env.TG_CHANNEL ?? '',
  },
  mediaDir: path.resolve(process.cwd(), process.env.MEDIA_DIR ?? 'media'),
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES ?? '30', 10),
  sessionFile: path.resolve(process.cwd(), 'session', 'session.txt'),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'novastroy',
  },
};
