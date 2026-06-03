-- Lead context (source + form metadata) injected at dispatch for outbound lead routing.
ALTER TABLE "Conversation" ADD COLUMN "leadContextJson" JSONB;
