import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = Router();

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional().default('starter'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signAccess(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  } as jwt.SignOptions);
}

function signRefresh(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  } as jwt.SignOptions);
}

router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash, plan: body.plan },
      select: { id: true, name: true, email: true, role: true, plan: true, computeBudget: true, createdAt: true },
    });

    const accessToken = signAccess(user.id, user.email, user.role);
    const refreshToken = signRefresh(user.id);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400_000) },
    });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 86400_000 });
    res.status(201).json({ user, accessToken });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    if (user.status === 'suspended') { res.status(403).json({ error: 'Account suspended' }); return; }

    const accessToken = signAccess(user.id, user.email, user.role);
    const refreshToken = signRefresh(user.id);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400_000) },
    });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 86400_000 });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, computeBudget: user.computeBudget },
      accessToken,
    });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { res.status(401).json({ error: 'No refresh token' }); return; }

    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) { res.status(401).json({ error: 'Refresh token expired' }); return; }

    const accessToken = signAccess(stored.user.id, stored.user.email, stored.user.role);
    res.json({ accessToken });
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    res.clearCookie('refreshToken');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/me', verifyJWT, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, plan: true, computeBudget: true, status: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/me', verifyJWT, async (req: any, res: any, next: any) => {
  try {
    const body = z.object({ name: z.string().min(1).optional() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: body,
      select: { id: true, name: true, email: true, role: true, plan: true, computeBudget: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.post('/onboarding', verifyJWT, async (req: any, res: any, next: any) => {
  try {
    const body = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      hearAbout: z.string().optional(),
      company: z.string().optional(),
      agreeUpdates: z.boolean().optional(),
      workType: z.string().optional(),
      websiteCount: z.string().optional(),
      frequency: z.string().optional(),
      experience: z.string().optional(),
    }).parse(req.body);

    const fullName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim();
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ...(fullName && { name: fullName }) },
    });
    res.json({ ok: true, savedAt: new Date().toISOString(), profile: body });
  } catch (err) { next(err); }
});

router.post('/change-password', verifyJWT, async (req: any, res: any, next: any) => {
  try {
    const body = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      res.status(400).json({ error: 'Current password is incorrect' }); return;
    }
    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
