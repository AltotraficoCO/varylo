-- CreateTable
CREATE TABLE "UserPresenceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "UserPresenceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPresenceSession_companyId_startedAt_idx" ON "UserPresenceSession"("companyId", "startedAt");

-- CreateIndex
CREATE INDEX "UserPresenceSession_userId_endedAt_idx" ON "UserPresenceSession"("userId", "endedAt");

-- AddForeignKey
ALTER TABLE "UserPresenceSession" ADD CONSTRAINT "UserPresenceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
