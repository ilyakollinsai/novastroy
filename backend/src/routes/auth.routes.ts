import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { signToken } from '../utils/jwt';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов'),
  companyName: z.string().min(1, 'Укажите название компании'),
  inn: z.string().min(1, 'Укажите ИНН'),
  specialization: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const [existing] = await pool.query<any[]>('SELECT id FROM users WHERE email = ?', [
      data.email,
    ]);
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [userResult] = await conn.query<any>(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [data.email, passwordHash, 'contractor'],
      );
      const userId = userResult.insertId as number;
      await conn.query(
        `INSERT INTO contractor_profiles
          (user_id, company_name, inn, specialization, phone, contact_person)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, data.companyName, data.inn, data.specialization, data.phone, data.contactPerson],
      );
      await conn.commit();

      const token = signToken({ userId, role: 'contractor' });
      res.status(201).json({ token, user: { id: userId, email: data.email, role: 'contractor' } });
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const [rows] = await pool.query<any[]>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [data.email],
    );
    const user = (rows as any[])[0];
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, email, role, created_at FROM users WHERE id = ?',
      [req.user!.userId],
    );
    const user = (rows as any[])[0];
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
