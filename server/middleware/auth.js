import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-change-before-production';
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}
