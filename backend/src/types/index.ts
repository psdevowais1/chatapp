import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface DecodedToken {
  userId: string;
  iat: number;
  exp: number;
}
