import { Router } from 'express';
import { prisma } from '../db.js';
import { z } from 'zod';

export const router = Router();

const BioSchema = z.object({ bio: z.string().max(300).optional(), avatarUrl: z.string().url().optional() });

router.get('/me', async (req, res) => {
  const id = (req.user as any)?.id;
  if (!id) return res.status(401).json({ error: 'Not authenticated' });
  const user = await prisma.user.findUnique({ where: { id } });
  res.json(user);
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/me', async (req, res) => {
  const id = (req.user as any)?.id;
  if (!id) return res.status(401).json({ error: 'Not authenticated' });
  const parse = BioSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const updated = await prisma.user.update({
    where: { id },
    data: { bio: parse.data.bio, avatarUrl: parse.data.avatarUrl }
  });
  res.json(updated);
});
