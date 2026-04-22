-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "groupPhoto" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "receiverId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupMember_conversationId_idx" ON "GroupMember"("conversationId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_conversationId_userId_key" ON "GroupMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Conversation_isGroup_idx" ON "Conversation"("isGroup");

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
