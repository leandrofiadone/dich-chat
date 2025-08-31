import { Router } from 'express';
import { prisma } from '../db.js';

export const router = Router();

router.get('/history', async (_req, res) => {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'asc' },
    include: { user: true }
  });
  res.json(messages);
});
