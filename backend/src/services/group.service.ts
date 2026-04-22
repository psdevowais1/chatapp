import prisma from '../config/database.js';

export interface CreateGroupData {
  name: string;
  creatorId: string;
  memberEmails: string[];
  groupPhoto?: string;
}

export interface AddMemberData {
  conversationId: string;
  emails: string[];
  addedBy: string;
}

export interface UpdateGroupData {
  conversationId: string;
  userId: string;
  name?: string;
  groupPhoto?: string;
}

export const createGroup = async (data: CreateGroupData) => {
  const { name, creatorId, memberEmails, groupPhoto } = data;

  // Find users by emails
  const users = await prisma.user.findMany({
    where: {
      email: { in: memberEmails },
    },
  });

  // Include creator in participants
  const participantIds = [creatorId, ...users.map((u) => u.id)];
  const uniqueParticipantIds = [...new Set(participantIds)];

  const group = await prisma.conversation.create({
    data: {
      isGroup: true,
      groupName: name,
      groupPhoto: groupPhoto || null,
      creatorId, // Store creator for delete permission
      participants: {
        connect: uniqueParticipantIds.map((id) => ({ id })),
      },
      groupMembers: {
        create: uniqueParticipantIds.map((userId) => ({
          userId,
          unreadCount: userId === creatorId ? 0 : 0,
        })),
      },
    },
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      groupMembers: true,
    },
  });

  return group;
};

export const addMembersToGroup = async (data: AddMemberData) => {
  const { conversationId, emails, addedBy } = data;

  // Verify it's a group and the adder is the creator (admin only)
  const group = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      isGroup: true,
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Only creator can add members
  if (group.creatorId !== addedBy) {
    throw new Error('Only the group creator can add members');
  }

  // Find users by emails
  const users = await prisma.user.findMany({
    where: {
      email: { in: emails },
    },
  });

  // Add new members
  const updatedGroup = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      participants: {
        connect: users.map((u) => ({ id: u.id })),
      },
      groupMembers: {
        create: users.map((u) => ({
          userId: u.id,
          unreadCount: 0,
        })),
      },
    },
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      groupMembers: true,
    },
  });

  return updatedGroup;
};

export const getGroupMembers = async (conversationId: string) => {
  const group = await prisma.conversation.findUnique({
    where: { id: conversationId, isGroup: true },
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
    },
  });

  return group?.participants || [];
};

export const leaveGroup = async (conversationId: string, userId: string) => {
  const group = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      isGroup: true,
      participants: { some: { id: userId } },
    },
  });

  if (!group) {
    throw new Error('Group not found or you are not a member');
  }

  // Remove user from participants and groupMembers
  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participants: {
          disconnect: { id: userId },
        },
      },
    }),
    prisma.groupMember.delete({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    }),
  ]);

  return { success: true };
};

export const deleteGroup = async (conversationId: string, userId: string) => {
  const group = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      isGroup: true,
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Only creator can delete the group
  if (group.creatorId !== userId) {
    throw new Error('Only the group creator can delete this group');
  }

  // Delete the group (cascade will handle messages and groupMembers)
  await prisma.conversation.delete({
    where: { id: conversationId },
  });

  return { success: true };
};

export const removeMemberFromGroup = async (conversationId: string, memberId: string, removedBy: string) => {
  const group = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      isGroup: true,
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Only creator can remove members
  if (group.creatorId !== removedBy) {
    throw new Error('Only the group creator can remove members');
  }

  // Cannot remove the creator
  if (memberId === group.creatorId) {
    throw new Error('Cannot remove the group creator');
  }

  // Check if member exists in group
  const memberExists = await prisma.groupMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: memberId },
    },
  });

  if (!memberExists) {
    throw new Error('Member not found in this group');
  }

  // Remove user from participants and groupMembers
  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participants: {
          disconnect: { id: memberId },
        },
      },
    }),
    prisma.groupMember.delete({
      where: {
        conversationId_userId: { conversationId, userId: memberId },
      },
    }),
  ]);

  const updatedGroup = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      groupMembers: true,
    },
  });

  return updatedGroup;
};

export const updateGroupInfo = async (
  conversationId: string,
  userId: string,
  data: { name?: string; groupPhoto?: string }
) => {
  const group = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      isGroup: true,
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  // Only creator can update group info
  if (group.creatorId !== userId) {
    throw new Error('Only the group creator can update group info');
  }

  const updateData: { groupName?: string; groupPhoto?: string } = {};
  if (data.name) updateData.groupName = data.name;
  if (data.groupPhoto !== undefined) updateData.groupPhoto = data.groupPhoto;

  if (Object.keys(updateData).length === 0) {
    throw new Error('No fields to update');
  }

  const updatedGroup = await prisma.conversation.update({
    where: { id: conversationId },
    data: updateData,
    include: {
      participants: {
        select: { id: true, name: true, email: true, profilePhoto: true },
      },
      groupMembers: true,
    },
  });

  return updatedGroup;
};
