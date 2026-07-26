import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: required('DB_USER', 'root'),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_NAME', 'novastroy'),
  },
  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  uploadsDir: path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads'),
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '15', 10) * 1024 * 1024,
};
