import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('contractor'), async (req, res, next) => {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM contractor_profiles WHERE user_id = ?',
      [req.user!.userId],
    );
    const profile = (rows as any[])[0];
    if (!profile) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  companyName: z.string().min(1),
  inn: z.string().min(1),
  specialization: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  about: z.string().optional().nullable(),
});

router.put('/', authenticate, requireRole('contractor'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    await pool.query(
      `UPDATE contractor_profiles
       SET company_name = ?, inn = ?, specialization = ?, phone = ?, contact_person = ?, about = ?
       WHERE user_id = ?`,
      [
        data.companyName,
        data.inn,
        data.specialization,
        data.phone,
        data.contactPerson,
        data.about ?? null,
        req.user!.userId,
      ],
    );
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM contractor_profiles WHERE user_id = ?',
      [req.user!.userId],
    );
    res.json({ profile: (rows as any[])[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
