import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';

export const isSuperUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SUPERUSER') {
      return res.status(403).json({ error: 'Access denied. Superuser only.' });
    }

    next();
  } catch (error) {
    console.error('Superuser middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
