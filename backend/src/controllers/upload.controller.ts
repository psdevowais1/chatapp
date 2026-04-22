import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      url: fileUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(500).json({ error: message });
  }
};
