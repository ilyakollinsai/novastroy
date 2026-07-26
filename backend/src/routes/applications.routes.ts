import fs from 'fs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadApplicationAttachments } from '../middleware/upload';

const router = Router();

async function getContractorId(userId: number): Promise<number | null> {
  const [rows] = await pool.query<any[]>(
    'SELECT id FROM contractor_profiles WHERE user_id = ?',
    [userId],
  );
  return (rows as any[])[0]?.id ?? null;
}

const applySchema = z.object({
  proposedPrice: z.coerce.number().nonnegative().optional(),
  comment: z.string().optional(),
});

// Тендер принимает заявки, пока открыт для подачи.
const APPLICABLE_STATUSES = ['open', 'review'];

router.post(
  '/tenders/:id/applications',
  authenticate,
  requireRole('contractor'),
  uploadApplicationAttachments.array('files', 10),
  async (req, res, next) => {
    try {
      const tenderId = parseInt(req.params.id, 10);
      const data = applySchema.parse(req.body);

      const contractorId = await getContractorId(req.user!.userId);
      if (!contractorId) {
        return res.status(400).json({ error: 'Заполните профиль подрядчика перед подачей заявки' });
      }

      const [tenderRows] = await pool.query<any[]>(
        `SELECT id, status FROM tenders WHERE id = ? AND status IN (${APPLICABLE_STATUSES.map(() => '?').join(',')})`,
        [tenderId, ...APPLICABLE_STATUSES],
      );
      if ((tenderRows as any[]).length === 0) {
        return res.status(404).json({ error: 'Тендер не найден или не принимает заявки' });
      }

      const [existing] = await pool.query<any[]>(
        'SELECT id FROM applications WHERE tender_id = ? AND contractor_id = ?',
        [tenderId, contractorId],
      );
      if ((existing as any[]).length > 0) {
        return res.status(409).json({ error: 'Вы уже подали заявку на этот тендер' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query<any>(
          `INSERT INTO applications (tender_id, contractor_id, proposed_price, comment, status)
           VALUES (?, ?, ?, ?, 'submitted')`,
          [tenderId, contractorId, data.proposedPrice ?? null, data.comment ?? null],
        );
        const applicationId = result.insertId as number;

        const files = (req.files as Express.Multer.File[]) ?? [];
        for (const file of files) {
          await conn.query(
            'INSERT INTO application_attachments (application_id, file_path, original_name) VALUES (?, ?, ?)',
            [applicationId, file.path, file.originalname],
          );
        }

        await conn.commit();
        res.status(201).json({ id: applicationId });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      next(err);
    }
  },
);

router.get('/applications/me', authenticate, requireRole('contractor'), async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user!.userId);
    if (!contractorId) {
      return res.json({ applications: [] });
    }
    const [rows] = await pool.query<any[]>(
      `SELECT a.*, t.title AS tender_title, t.public_code AS tender_public_code,
              t.status AS tender_status, t.deadline AS tender_deadline
       FROM applications a
       JOIN tenders t ON t.id = a.tender_id
       WHERE a.contractor_id = ?
       ORDER BY a.submitted_at DESC`,
      [contractorId],
    );
    res.json({ applications: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/applications/:id', authenticate, requireRole('contractor'), async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user!.userId);
    const id = parseInt(req.params.id, 10);

    const [rows] = await pool.query<any[]>(
      `SELECT a.*, t.title AS tender_title, t.public_code AS tender_public_code, t.status AS tender_status
       FROM applications a
       JOIN tenders t ON t.id = a.tender_id
       WHERE a.id = ? AND a.contractor_id = ?`,
      [id, contractorId],
    );
    const application = (rows as any[])[0];
    if (!application) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const [attachments] = await pool.query<any[]>(
      'SELECT id, original_name, uploaded_at FROM application_attachments WHERE application_id = ?',
      [id],
    );

    res.json({ application, attachments });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/applications/:id/attachments/:fileId',
  authenticate,
  requireRole('contractor'),
  async (req, res, next) => {
    try {
      const contractorId = await getContractorId(req.user!.userId);
      const id = parseInt(req.params.id, 10);
      const fileId = parseInt(req.params.fileId, 10);

      const [appRows] = await pool.query<any[]>(
        'SELECT id FROM applications WHERE id = ? AND contractor_id = ?',
        [id, contractorId],
      );
      if ((appRows as any[]).length === 0) {
        return res.status(404).json({ error: 'Заявка не найдена' });
      }

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
  },
);

export default router;
