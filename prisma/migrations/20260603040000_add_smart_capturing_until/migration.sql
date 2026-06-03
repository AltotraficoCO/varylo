-- Shows the "Capturando datos" indicator while smart capture is running.
ALTER TABLE "Conversation" ADD COLUMN "smartCapturingUntil" TIMESTAMP(3);
