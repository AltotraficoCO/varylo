-- Per cron-node last-run tracking for scheduled automation flows.
ALTER TABLE "AutomationFlow" ADD COLUMN "cronStateJson" JSONB;
