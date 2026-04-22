import { Response } from 'express';
import { searchUserByEmail, getUserByEmail, updateUserProfile, updateUserPassword } from '../services/user.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { email } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email search term is required' });
      return;
    }

    const users = await searchUserByEmail(email, userId);
    res.status(200).json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    res.status(500).json({ error: message });
  }
};

export const checkUserExists = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { email } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await getUserByEmail(email);

    if (user) {
      res.status(200).json({ exists: true, user });
    } else {
      res.status(404).json({ exists: false, message: `User with email "${email}" does not exist` });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check failed';
    res.status(500).json({ error: message });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { name, profilePhoto } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updateData: { name?: string; profilePhoto?: string } = {};
    if (name) updateData.name = name;
    if (profilePhoto) updateData.profilePhoto = profilePhoto;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const user = await updateUserProfile(userId, updateData);
    res.status(200).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    res.status(500).json({ error: message });
  }
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    await updateUserPassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password update failed';
    res.status(400).json({ error: message });
  }
};
