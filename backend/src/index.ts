import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import websitesRouter from './routes/websites';
import dlqRouter from './routes/dlq';
import resultsRouter from './routes/results';
import patternsRouter from './routes/patterns';
import monitorRouter from './routes/monitor';
import adminRouter from './routes/admin';
import keywordsRouter from './routes/keywords';
import hitsRouter from './routes/hits';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/websites', websitesRouter);
app.use('/api/dlq', dlqRouter);
app.use('/api/results', resultsRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/monitor', monitorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/keywords', keywordsRouter);
app.use('/api/hits', hitsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`[backend] running on http://localhost:${PORT}`));
