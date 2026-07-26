import cors from 'cors';
import express from 'express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import adminRoutes from './routes/admin.routes';
import applicationsRoutes from './routes/applications.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import tendersRoutes from './routes/tenders.routes';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tenders', tendersRoutes);
app.use('/api', applicationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use(errorHandler);
