import jwt from 'jsonwebtoken';
import { config } from '../config';

export type JwtPayload = {
  userId: number;
  role: 'contractor' | 'admin';
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}
