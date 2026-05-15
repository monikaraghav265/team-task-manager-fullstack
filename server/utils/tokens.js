import jwt from 'jsonwebtoken';

export function signAuthToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-before-production';
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}
