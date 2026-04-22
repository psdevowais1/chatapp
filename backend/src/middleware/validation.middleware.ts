import { Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AuthenticatedRequest } from '../types/index.js';

export const validate = (schema: ZodSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Validation failed', details: error });
    }
  };
};
