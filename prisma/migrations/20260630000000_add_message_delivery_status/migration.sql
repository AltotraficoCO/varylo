-- Persist WhatsApp delivery status so a 'failed' message stops showing as "sent"
-- and Meta's error reason (e.g. 131049) is no longer discarded by the status webhook.

ALTER TABLE "Message" ADD COLUMN "status" TEXT;
ALTER TABLE "Message" ADD COLUMN "errorCode" INTEGER;
ALTER TABLE "Message" ADD COLUMN "errorMessage" TEXT;
