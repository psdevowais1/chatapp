import { Response } from 'express';
import { registerUser, loginUser, getUserById } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const result = await registerUser(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user';
    res.status(500).json({ error: message });
  }
};
