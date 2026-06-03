-- Automatic follow-ups: config on the agent, per-conversation progress.
ALTER TABLE "AiAgent" ADD COLUMN "followupJson" JSONB;
ALTER TABLE "Conversation" ADD COLUMN "followupJson" JSONB;
