-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';
