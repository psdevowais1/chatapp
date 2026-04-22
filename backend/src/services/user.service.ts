import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

export const searchUserByEmail = async (email: string, excludeUserId: string) => {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: email,
        mode: 'insensitive',
      },
      NOT: {
        id: excludeUserId,
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      profilePhoto: true,
    },
    take: 10,
  });

  return users;
};

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      profilePhoto: true,
    },
  });

  return user;
};

export const updateUserProfile = async (
  userId: string,
  data: { name?: string; profilePhoto?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      profilePhoto: true,
      createdAt: true,
    },
  });

  return user;
};

export const updateUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });

  return true;
};
