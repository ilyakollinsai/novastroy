import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadTenderAttachments } from '../middleware/upload';

const router = Router();
router.use(authenticate, requireRole('admin'));

function normalizeRequirements(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? JSON.stringify(parsed) : value;
    } catch {
      return value;
    }
  }
  return null;
}

async function assignPublicCode(conn: any, tenderId: number) {
  const year = new Date().getFullYear();
  const code = `SI-${year}-${String(tenderId).padStart(4, '0')}`;
  await conn.query('UPDATE tenders SET public_code = ? WHERE id = ?', [code, tenderId]);
  return code;
}

// ---------- Тендеры ----------

router.get('/tenders', async (req, res, next) => {
  try {
    const { status, category, search } = req.query as Record<string, string | undefined>;
    const where: string[] = [];
    const params: any[] = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (search) {
      where.push('(title LIKE ? OR description LIKE ? OR public_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM tenders ${whereSql} ORDER BY created_at DESC`,
      params,
    );
    res.json({ tenders: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/tenders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query<any[]>('SELECT * FROM tenders WHERE id = ?', [id]);
    const tender = (rows as any[])[0];
    if (!tender) return res.status(404).json({ error: 'Тендер не найден' });
    const [attachments] = await pool.query<any[]>(
      'SELECT id, original_name, uploaded_at FROM tender_attachments WHERE tender_id = ?',
      [id],
    );
    res.json({ tender, attachments });
  } catch (err) {
    next(err);
  }
});

const tenderSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  sum: z.coerce.number().nonnegative().optional().nullable(),
  deadline: z.string().optional().nullable(),
  status: z.enum(['draft', 'open', 'review', 'closed', 'won']).optional().default('open'),
  requirements: z.any().optional(),
});

router.post('/tenders', uploadTenderAttachments.array('files', 10), async (req, res, next) => {
  try {
    const data = tenderSchema.parse(req.body);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<any>(
        `INSERT INTO tenders (title, description, category, sum, deadline, status, source, requirements, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
        [
          data.title,
          data.description,
          data.category,
          data.sum ?? null,
          data.deadline || null,
          data.status,
          normalizeRequirements(data.requirements),
          req.user!.userId,
        ],
      );
      const tenderId = result.insertId as number;
      await assignPublicCode(conn, tenderId);

      const files = (req.files as Express.Multer.File[]) ?? [];
      for (const file of files) {
        await conn.query(
          'INSERT INTO tender_attachments (tender_id, file_path, original_name) VALUES (?, ?, ?)',
          [tenderId, file.path, file.originalname],
        );
      }
      await conn.commit();
      res.status(201).json({ id: tenderId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

const tenderUpdateSchema = tenderSchema.partial();

router.put('/tenders/:id', uploadTenderAttachments.array('files', 10), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = tenderUpdateSchema.parse(req.body);

    const fields: string[] = [];
    const params: any[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
    if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
    if (data.sum !== undefined) { fields.push('sum = ?'); params.push(data.sum); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); params.push(data.deadline || null); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
    if (data.requirements !== undefined) {
      fields.push('requirements = ?');
      params.push(normalizeRequirements(data.requirements));
    }

    if (fields.length > 0) {
      params.push(id);
      const [result] = await pool.query<any>(
        `UPDATE tenders SET ${fields.join(', ')} WHERE id = ?`,
        params,
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Тендер не найден' });
      }
    }

    const files = (req.files as Express.Multer.File[]) ?? [];
    for (const file of files) {
      await pool.query(
        'INSERT INTO tender_attachments (tender_id, file_path, original_name) VALUES (?, ?, ?)',
        [id, file.path, file.originalname],
      );
    }

    const [rows] = await pool.query<any[]>('SELECT * FROM tenders WHERE id = ?', [id]);
    res.json({ tender: (rows as any[])[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/tenders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [attachments] = await pool.query<any[]>(
      'SELECT file_path FROM tender_attachments WHERE tender_id = ?',
      [id],
    );
    const [result] = await pool.query<any>('DELETE FROM tenders WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Тендер не найден' });
    }
    for (const a of attachments as any[]) {
      fs.unlink(a.file_path, () => {});
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/tenders/:id/attachments/:fileId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fileId = parseInt(req.params.fileId, 10);
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

// ---------- Заявки ----------

router.get('/applications', async (req, res, next) => {
  try {
    const { tenderId, status } = req.query as Record<string, string | undefined>;
    const where: string[] = [];
    const params: any[] = [];
    if (tenderId) {
      where.push('a.tender_id = ?');
      params.push(parseInt(tenderId, 10));
    }
    if (status) {
      where.push('a.status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query<any[]>(
      `SELECT a.*, t.title AS tender_title, t.public_code AS tender_public_code,
              cp.company_name, cp.inn, cp.phone, cp.contact_person
       FROM applications a
       JOIN tenders t ON t.id = a.tender_id
       JOIN contractor_profiles cp ON cp.id = a.contractor_id
       ${whereSql}
       ORDER BY a.submitted_at DESC`,
      params,
    );
    res.json({ applications: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query<any[]>(
      `SELECT a.*, t.title AS tender_title, t.public_code AS tender_public_code,
              cp.company_name, cp.inn, cp.phone, cp.contact_person, cp.specialization
       FROM applications a
       JOIN tenders t ON t.id = a.tender_id
       JOIN contractor_profiles cp ON cp.id = a.contractor_id
       WHERE a.id = ?`,
      [id],
    );
    const application = (rows as any[])[0];
    if (!application) return res.status(404).json({ error: 'Заявка не найдена' });
    const [attachments] = await pool.query<any[]>(
      'SELECT id, original_name, uploaded_at FROM application_attachments WHERE application_id = ?',
      [id],
    );
    res.json({ application, attachments });
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id/attachments/:fileId', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fileId = parseInt(req.params.fileId, 10);
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM application_attachments WHERE id = ? AND application_id = ?',
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

const statusSchema = z.object({
  status: z.enum(['submitted', 'under_review', 'won', 'rejected']),
});

router.put('/applications/:id/status', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = statusSchema.parse(req.body);
    const [result] = await pool.query<any>('UPDATE applications SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const winnerSchema = z.object({
  contractorId: z.coerce.number().int().positive(),
});

router.put('/tenders/:id/winner', async (req, res, next) => {
  try {
    const tenderId = parseInt(req.params.id, 10);
    const { contractorId } = winnerSchema.parse(req.body);

    const [appRows] = await pool.query<any[]>(
      'SELECT id FROM applications WHERE tender_id = ? AND contractor_id = ?',
      [tenderId, contractorId],
    );
    if ((appRows as any[]).length === 0) {
      return res.status(400).json({ error: 'У этого подрядчика нет заявки на данный тендер' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [tenderResult] = await conn.query<any>(
        'UPDATE tenders SET status = ?, winner_contractor_id = ? WHERE id = ?',
        ['won', contractorId, tenderId],
      );
      if (tenderResult.affectedRows === 0) {
        throw Object.assign(new Error('Тендер не найден'), { status: 404 });
      }
      await conn.query(
        `UPDATE applications SET status = 'won' WHERE tender_id = ? AND contractor_id = ?`,
        [tenderId, contractorId],
      );
      await conn.query(
        `UPDATE applications SET status = 'rejected' WHERE tender_id = ? AND contractor_id != ?`,
        [tenderId, contractorId],
      );
      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

// ---------- Модерация распарсенных тендеров ----------

router.get('/tender-sources', async (req, res, next) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM tender_sources_raw WHERE status = ? ORDER BY fetched_at DESC',
      [status],
    );
    res.json({ sources: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/tender-sources/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query<any[]>('SELECT * FROM tender_sources_raw WHERE id = ?', [id]);
    const source = (rows as any[])[0];
    if (!source) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ source });
  } catch (err) {
    next(err);
  }
});

const approveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  sum: z.coerce.number().nonnegative().optional().nullable(),
  deadline: z.string().optional().nullable(),
  requirements: z.any().optional(),
});

router.post('/tender-sources/:id/approve', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = approveSchema.parse(req.body);

    const [sourceRows] = await pool.query<any[]>(
      `SELECT * FROM tender_sources_raw WHERE id = ? AND status = 'pending'`,
      [id],
    );
    const source = (sourceRows as any[])[0];
    if (!source) {
      return res.status(404).json({ error: 'Запись не найдена или уже обработана' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<any>(
        `INSERT INTO tenders (title, description, category, sum, deadline, status, source, requirements, created_by)
         VALUES (?, ?, ?, ?, ?, 'open', 'parsed', ?, ?)`,
        [
          data.title,
          data.description,
          data.category,
          data.sum ?? null,
          data.deadline || null,
          normalizeRequirements(data.requirements),
          req.user!.userId,
        ],
      );
      const tenderId = result.insertId as number;
      await assignPublicCode(conn, tenderId);

      // Прикреплённые к посту фото/документы переносим как вложения тендера.
      let mediaPaths: string[] = [];
      try {
        mediaPaths = source.raw_media_paths ? JSON.parse(source.raw_media_paths) : [];
      } catch {
        mediaPaths = [];
      }
      for (const mediaPath of mediaPaths) {
        await conn.query(
          'INSERT INTO tender_attachments (tender_id, file_path, original_name) VALUES (?, ?, ?)',
          [tenderId, mediaPath, mediaPath.split('/').pop() ?? mediaPath],
        );
      }

      await conn.query(
        `UPDATE tender_sources_raw SET status = 'approved', linked_tender_id = ? WHERE id = ?`,
        [tenderId, id],
      );
      await conn.commit();
      res.status(201).json({ tenderId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
});

router.post('/tender-sources/:id/reject', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query<any>(
      `UPDATE tender_sources_raw SET status = 'rejected' WHERE id = ? AND status = 'pending'`,
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Запись не найдена или уже обработана' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
