import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // ZodError: name === 'ZodError' and has an errors array
  if (err?.name === 'ZodError' && Array.isArray(err?.errors)) {
    res.status(400).json({ error: err.errors.map((e: any) => e.message).join(', ') });
    return;
  }
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
}
