-- Contact Lists & Broadcasts
-- Run with: NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "const {Client}=require('pg'); const c=new Client(process.env.DIRECT_URL); c.connect().then(()=>c.query(require('fs').readFileSync('migrations/003_contact_lists_broadcasts.sql','utf8'))).then(r=>{console.log('Done');c.end()}).catch(e=>{console.error(e);c.end()})"

-- Enum
DO $$ BEGIN
  CREATE TYPE "BroadcastStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ContactList
CREATE TABLE IF NOT EXISTS "ContactList" (
  "id"          TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactList_companyId_idx" ON "ContactList"("companyId");

-- ContactList members join table (Prisma implicit m2m)
CREATE TABLE IF NOT EXISTS "_ContactListMembers" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "_ContactListMembers_AB_unique" ON "_ContactListMembers"("A", "B");
CREATE INDEX IF NOT EXISTS "_ContactListMembers_B_index" ON "_ContactListMembers"("B");
ALTER TABLE "_ContactListMembers" DROP CONSTRAINT IF EXISTS "_ContactListMembers_A_fkey";
ALTER TABLE "_ContactListMembers" ADD CONSTRAINT "_ContactListMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ContactListMembers" DROP CONSTRAINT IF EXISTS "_ContactListMembers_B_fkey";
ALTER TABLE "_ContactListMembers" ADD CONSTRAINT "_ContactListMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Broadcast
CREATE TABLE IF NOT EXISTS "Broadcast" (
  "id"                  TEXT NOT NULL,
  "companyId"           TEXT NOT NULL,
  "contactListId"       TEXT NOT NULL,
  "templateName"        TEXT NOT NULL,
  "templateLang"        TEXT NOT NULL,
  "templateComponents"  JSONB NOT NULL DEFAULT '[]',
  "templateBody"        TEXT,
  "status"              "BroadcastStatus" NOT NULL DEFAULT 'PENDING',
  "totalContacts"       INTEGER NOT NULL DEFAULT 0,
  "sentCount"           INTEGER NOT NULL DEFAULT 0,
  "failedCount"         INTEGER NOT NULL DEFAULT 0,
  "createdById"         TEXT NOT NULL,
  "startedAt"           TIMESTAMP(3),
  "completedAt"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Broadcast_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Broadcast_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Broadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Broadcast_companyId_idx" ON "Broadcast"("companyId");

-- BroadcastLog
CREATE TABLE IF NOT EXISTS "BroadcastLog" (
  "id"            TEXT NOT NULL,
  "broadcastId"   TEXT NOT NULL,
  "contactId"     TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "errorMessage"  TEXT,
  "sentAt"        TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BroadcastLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BroadcastLog_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BroadcastLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BroadcastLog_broadcastId_idx" ON "BroadcastLog"("broadcastId");
