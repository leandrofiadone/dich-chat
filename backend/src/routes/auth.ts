import { Router } from 'express';
import passport from '../auth/google.js';
import jwt from 'jsonwebtoken';

export const router = Router();

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Create JWT and set as httpOnly cookie
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt';
    const payload = { id: (req.user as any).id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('auth_token', token, { httpOnly: true, sameSite: 'lax' });
    const origin = process.env.ORIGIN_CORS || 'http://localhost:5173';
    res.redirect(origin + '/dashboard');
  }
);

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

router.get('/failure', (_req, res) => res.status(401).json({ error: 'Auth failed' }));

router.post('/logout', (req, res) => {
  req.logout({ keepSessionInfo: false }, () => {});
  res.clearCookie('auth_token');
  res.json({ ok: true });
});
