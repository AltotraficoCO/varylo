-- Hot-path indexes. Non-destructive (CREATE INDEX only); IF NOT EXISTS keeps it idempotent.

-- Inbound webhook resolves the open conversation by channel + contact on every message.
CREATE INDEX IF NOT EXISTS "Conversation_companyId_channelId_contactId_status_idx"
    ON "Conversation" ("companyId", "channelId", "contactId", "status");

-- Followups cron scans conversations by AI agent + last inbound time.
CREATE INDEX IF NOT EXISTS "Conversation_handledByAiAgentId_lastInboundAt_idx"
    ON "Conversation" ("handledByAiAgentId", "lastInboundAt");

-- AI agent + smart capture load the latest messages of a conversation ordered by date.
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
    ON "Message" ("conversationId", "createdAt");
