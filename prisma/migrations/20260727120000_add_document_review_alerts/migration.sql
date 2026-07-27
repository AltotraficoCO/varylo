-- Document review alerts: flag conversations with an unreviewed inbound document
-- and per-agent opt-in for the alert.
ALTER TABLE "Conversation" ADD COLUMN "documentPendingAt" TIMESTAMP(3);
ALTER TABLE "AiAgent" ADD COLUMN "documentAlertEnabled" BOOLEAN NOT NULL DEFAULT false;
