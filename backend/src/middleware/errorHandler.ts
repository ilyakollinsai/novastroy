import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Ошибка валидации', details: err.errors });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
  }
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Запись уже существует' });
  }
  const status = err?.status ?? 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err?.message ?? 'Внутренняя ошибка сервера' });
}
