import crypto from 'crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser, signAuthToken } from '../utils/tokens.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const router = express.Router();

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email: z.string().trim().email('Enter a valid email.').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(72)
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required.')
});

const forgotSchema = z.object({
  email: z.string().trim().email().toLowerCase()
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(72)
});

router.post('/signup', async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash
      }
    });

    return res.status(201).json({
      token: signAuthToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({ token: signAuthToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const genericMessage = 'If that email exists, a password reset link has been prepared.';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    });

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    const delivery = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });

    const allowDemo = process.env.ALLOW_DEMO_RESET_LINK !== 'false';
    return res.json({
      message: delivery.delivered ? 'Password reset email sent.' : genericMessage,
      resetUrl: !delivery.delivered && allowDemo ? delivery.demoResetUrl : undefined
    });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'This reset link is invalid or expired.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } })
    ]);

    return res.json({ message: 'Password updated successfully. Please log in.' });
  } catch (error) {
    next(error);
  }
});

export default router;
