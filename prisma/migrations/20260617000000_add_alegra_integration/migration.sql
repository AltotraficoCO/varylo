-- Alegra billing integration (super-admin only)

-- Global Alegra configuration (single row)
CREATE TABLE "AlegraConfig" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlegraConfig_pkey" PRIMARY KEY ("id")
);

-- Cache the Alegra contact id on the company so invoices reuse the same contact
ALTER TABLE "Company" ADD COLUMN "alegraContactId" TEXT;

-- Link an emitted Alegra invoice to its approved billing attempt
ALTER TABLE "BillingAttempt" ADD COLUMN "alegraInvoiceId" TEXT;
ALTER TABLE "BillingAttempt" ADD COLUMN "alegraInvoiceNumber" TEXT;
ALTER TABLE "BillingAttempt" ADD COLUMN "alegraInvoiceUrl" TEXT;
