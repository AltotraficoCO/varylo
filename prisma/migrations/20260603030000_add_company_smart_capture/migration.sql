-- Account-wide passive data capture (also on human-handled conversations).
ALTER TABLE "Company" ADD COLUMN "smartCaptureEnabled" BOOLEAN NOT NULL DEFAULT false;
