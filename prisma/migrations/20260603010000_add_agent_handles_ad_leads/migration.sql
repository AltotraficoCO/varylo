-- Designate an AI agent to handle inbound Click-to-WhatsApp ad leads (Meta referral).
ALTER TABLE "AiAgent" ADD COLUMN "handlesAdLeads" BOOLEAN NOT NULL DEFAULT false;
