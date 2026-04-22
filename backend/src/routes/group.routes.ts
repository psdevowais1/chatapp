import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createGroup, addMembersToGroup, getGroupMembers, leaveGroup, deleteGroup, removeMemberFromGroup, updateGroupInfo } from '../services/group.service.js';
import { emitGroupUpdate, emitMemberRemoved, emitMemberAdded, emitGroupDeleted } from '../config/socket.js';
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

    // Emit socket events to new members
    if (group.participants) {
      group.participants.forEach((participant: any) => {
        if (participant.id !== creatorId) {
          emitMemberAdded(group.id, participant.id, group);
        }
      });
    }

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

    // Emit socket events for new members
    if (group?.participants) {
      const newMemberIds = group.participants.map((p: any) => p.id);
      newMemberIds.forEach((userId: string) => {
        emitMemberAdded(conversationId, userId, group);
      });
    }

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
    emitMemberRemoved(conversationId, userId, conversationId);
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
    emitGroupDeleted(conversationId);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete group';
    res.status(403).json({ error: message });
  }
});

router.delete('/:conversationId/members/:memberId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, memberId } = req.params;
    const userId = req.userId!;

    const group = await removeMemberFromGroup(conversationId, memberId, userId);
    emitMemberRemoved(conversationId, memberId, conversationId);
    res.json({ success: true, group });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    res.status(403).json({ error: message });
  }
});

router.patch('/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId!;
    const { name, groupPhoto } = req.body;

    const group = await updateGroupInfo(conversationId, userId, { name, groupPhoto });
    emitGroupUpdate(conversationId, group);
    res.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update group';
    res.status(403).json({ error: message });
  }
});

export default router;
