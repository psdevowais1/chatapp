import { Router } from 'express';
import { searchUsers, updateProfile, updatePassword, checkUserExists } from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/check-email', authMiddleware, checkUserExists);
router.put('/profile', authMiddleware, updateProfile);
router.put('/password', authMiddleware, updatePassword);

export default router;
