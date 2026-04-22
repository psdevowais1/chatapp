import { Router } from 'express';
import {
  createNewConversation,
  getConversations,
  getMessages,
  createMessage,
} from '../controllers/chat.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/conversations', authMiddleware, createNewConversation);
router.get('/conversations', authMiddleware, getConversations);
router.get('/conversations/:conversationId/messages', authMiddleware, getMessages);
router.post('/conversations/:conversationId/messages', authMiddleware, createMessage);

export default router;
