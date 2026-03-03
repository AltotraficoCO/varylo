-- CreateEnum
CREATE TYPE "AssignmentStrategy" AS ENUM ('LEAST_BUSY', 'ROUND_ROBIN', 'SPECIFIC_AGENT', 'MANUAL_ONLY');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "assignmentStrategy" "AssignmentStrategy" NOT NULL DEFAULT 'LEAST_BUSY',
ADD COLUMN "specificAgentId" TEXT,
ADD COLUMN "roundRobinLastUserId" TEXT;
