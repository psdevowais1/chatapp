import { Router } from 'express';
import { uploadFile } from '../controllers/upload.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';

const router = Router();

router.post('/upload', authMiddleware, uploadSingle, uploadFile);

export default router;
