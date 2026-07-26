import fs from 'fs';
import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Тендеры, ожидающие модерации (draft), никогда не показываются в публичном API.
const PUBLIC_STATUSES = ['open', 'review', 'closed', 'won'];
const PAGE_SIZE = 10;

router.get('/', async (req, res, next) => {
  try {
    const { status, category, search } = req.query as Record<string, string | undefined>;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const where: string[] = [];
    const params: any[] = [];

    if (status && PUBLIC_STATUSES.includes(status)) {
      where.push('status = ?');
      params.push(status);
    } else {
      where.push(`status IN (${PUBLIC_STATUSES.map(() => '?').join(',')})`);
      params.push(...PUBLIC_STATUSES);
    }

    if (category) {
      where.push('category = ?');
      params.push(category);
    }

    if (search) {
      where.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM tenders ${whereSql}`,
      params,
    );
    const total = (countRows as any[])[0].total as number;

    const [rows] = await pool.query<any[]>(
      `SELECT id, public_code, title, category, sum, deadline, status, source, created_at, updated_at
       FROM tenders ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset],
    );

    res.json({
      tenders: rows,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query<any[]>(
      `SELECT t.*, cp.company_name AS winner_company_name
       FROM tenders t
       LEFT JOIN contractor_profiles cp ON cp.id = t.winner_contractor_id
       WHERE t.id = ? AND t.status IN (${PUBLIC_STATUSES.map(() => '?').join(',')})`,
      [id, ...PUBLIC_STATUSES],
    );
    const tender = (rows as any[])[0];
    if (!tender) {
      return res.status(404).json({ error: 'Тендер не найден' });
    }

    const [attachments] = await pool.query<any[]>(
      'SELECT id, original_name, uploaded_at FROM tender_attachments WHERE tender_id = ?',
      [id],
    );

    res.json({ tender, attachments });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/attachments/:fileId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fileId = parseInt(req.params.fileId, 10);

    const [tenderRows] = await pool.query<any[]>(
      `SELECT id FROM tenders WHERE id = ? AND status IN (${PUBLIC_STATUSES.map(() => '?').join(',')})`,
      [id, ...PUBLIC_STATUSES],
    );
    if ((tenderRows as any[]).length === 0) {
      return res.status(404).json({ error: 'Тендер не найден' });
    }

    const [rows] = await pool.query<any[]>(
      'SELECT * FROM tender_attachments WHERE id = ? AND tender_id = ?',
      [fileId, id],
    );
    const attachment = (rows as any[])[0];
    if (!attachment || !fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    res.download(attachment.file_path, attachment.original_name);
  } catch (err) {
    next(err);
  }
});

export default router;
