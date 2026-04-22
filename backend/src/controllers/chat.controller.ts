import { Response } from 'express';
import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
} from '../services/chat.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export const createNewConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { otherUserId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!otherUserId) {
      res.status(400).json({ error: 'Other user ID is required' });
      return;
    }

    const conversation = await createConversation(userId, otherUserId);
    res.status(200).json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    res.status(500).json({ error: message });
  }
};

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversations = await getUserConversations(userId);
    res.status(200).json(conversations);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get conversations';
    res.status(500).json({ error: message });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    const messages = await getConversationMessages(conversationId, userId);
    res.status(200).json(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get messages';
    res.status(500).json({ error: message });
  }
};

export const createMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { receiverId, content } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!conversationId || !receiverId || !content) {
      res.status(400).json({ error: 'Conversation ID, receiver ID, and content are required' });
      return;
    }

    const message = await sendMessage(conversationId, userId, receiverId, content);
    res.status(201).json(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    res.status(500).json({ error: message });
  }
};
