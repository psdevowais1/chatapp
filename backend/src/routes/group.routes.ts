import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createGroup, addMembersToGroup, getGroupMembers, leaveGroup, deleteGroup } from '../services/group.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Response } from 'express';

const router = Router();

router.post('/create', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, memberEmails, groupPhoto } = req.body;
    const creatorId = req.userId!;

    if (!name || !memberEmails || !Array.isArray(memberEmails)) {
      return res.status(400).json({ error: 'Group name and member emails are required' });
    }

    const group = await createGroup({
      name,
      creatorId,
      memberEmails,
      groupPhoto,
    });

    res.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create group';
    res.status(500).json({ error: message });
  }
});

router.post('/add-members', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, emails } = req.body;
    const addedBy = req.userId!;

    if (!conversationId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Conversation ID and emails are required' });
    }

    const group = await addMembersToGroup({
      conversationId,
      emails,
      addedBy,
    });

    res.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add members';
    res.status(500).json({ error: message });
  }
});

router.get('/:conversationId/members', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const members = await getGroupMembers(conversationId);
    res.json(members);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get members';
    res.status(500).json({ error: message });
  }
});

router.post('/:conversationId/leave', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId!;

    await leaveGroup(conversationId, userId);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to leave group';
    res.status(500).json({ error: message });
  }
});

router.delete('/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId!;

    await deleteGroup(conversationId, userId);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete group';
    res.status(403).json({ error: message });
  }
});

export default router;
