-- Development V1.1 foundation; deploy only with separately approved maintenance/backup plan.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='60s';
-- Read-only, fail-closed checks. Caller must hold User/Account/Trade locks in one transaction.
DO $$
BEGIN
 IF to_regclass('public."TradingAccount"') IS NULL OR to_regclass('public."Trade"') IS NULL THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_OLD_SCHEMA';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='TradingAccount' AND column_name='isCurrent')
 OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name='revision')
 OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name IN ('entry','sl','tp') AND numeric_precision=10 AND numeric_scale=5) <> 3
 OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name='accountId' AND is_nullable='NO') THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_BASELINE_MISMATCH';
 END IF;
END $$;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM "Trade" t LEFT JOIN "TradingAccount" a ON a.id=t."accountId" LEFT JOIN "User" u ON u.id=t."userId" WHERE a.id IS NULL OR u.id IS NULL OR a."userId"<>t."userId")
 OR EXISTS (SELECT 1 FROM "TradingAccount" a LEFT JOIN "User" u ON u.id=a."userId" WHERE u.id IS NULL) THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_OWNERSHIP';
 END IF;
 IF EXISTS (SELECT 1 FROM "TradingAccount" WHERE "isCurrent" GROUP BY "userId" HAVING count(*)>1) THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_MULTIPLE_CURRENT';
 END IF;
 IF EXISTS (SELECT 1 FROM "Trade" WHERE entry::text='NaN' OR sl::text='NaN' OR tp::text='NaN' OR rr::text='NaN') THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_NONFINITE';
 END IF;
END $$;

LOCK TABLE "User","TradingAccount","Trade" IN ACCESS EXCLUSIVE MODE;
-- Read-only, fail-closed checks. Caller must hold User/Account/Trade locks in one transaction.
DO $$
BEGIN
 IF to_regclass('public."TradingAccount"') IS NULL OR to_regclass('public."Trade"') IS NULL THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_OLD_SCHEMA';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='TradingAccount' AND column_name='isCurrent')
 OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name='revision')
 OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name IN ('entry','sl','tp') AND numeric_precision=10 AND numeric_scale=5) <> 3
 OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Trade' AND column_name='accountId' AND is_nullable='NO') THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_BASELINE_MISMATCH';
 END IF;
END $$;
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM "Trade" t LEFT JOIN "TradingAccount" a ON a.id=t."accountId" LEFT JOIN "User" u ON u.id=t."userId" WHERE a.id IS NULL OR u.id IS NULL OR a."userId"<>t."userId")
 OR EXISTS (SELECT 1 FROM "TradingAccount" a LEFT JOIN "User" u ON u.id=a."userId" WHERE u.id IS NULL) THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_OWNERSHIP';
 END IF;
 IF EXISTS (SELECT 1 FROM "TradingAccount" WHERE "isCurrent" GROUP BY "userId" HAVING count(*)>1) THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_MULTIPLE_CURRENT';
 END IF;
 IF EXISTS (SELECT 1 FROM "Trade" WHERE entry::text='NaN' OR sl::text='NaN' OR tp::text='NaN' OR rr::text='NaN') THEN
  RAISE EXCEPTION 'V11_PREFLIGHT_NONFINITE';
 END IF;
END $$;
-- CreateEnum
CREATE TYPE "PerformanceStatus" AS ENUM ('OPEN', 'PARTIAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "PerformanceSource" AS ENUM ('MANUAL', 'EXECUTIONS', 'IMPORT');

-- CreateEnum
CREATE TYPE "ExecutionKind" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "ChargeKind" AS ENUM ('COMMISSION', 'SWAP', 'OTHER');

-- DropForeignKey
ALTER TABLE "TradingAccount" DROP CONSTRAINT "TradingAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_userId_fkey";

-- DropForeignKey
ALTER TABLE "Trade" DROP CONSTRAINT "Trade_accountId_fkey";

-- AlterTable
ALTER TABLE "TradingAccount" ADD COLUMN     "denominationLabel" VARCHAR(32),
ADD COLUMN     "settlementUnitKey" VARCHAR(160),
ADD COLUMN     "unitsPerMajor" DECIMAL(20,8);

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "entry" SET DATA TYPE DECIMAL(38,18),
ALTER COLUMN "sl" SET DATA TYPE DECIMAL(38,18),
ALTER COLUMN "tp" SET DATA TYPE DECIMAL(38,18);

-- CreateTable
CREATE TABLE "TradePerformance" (
    "tradeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "PerformanceStatus",
    "source" "PerformanceSource",
    "moneyUnitKey" VARCHAR(160),
    "initialRiskAmount" DECIMAL(38,12),
    "reportedGrossPnl" DECIMAL(38,12),
    "reportedNetPnl" DECIMAL(38,12),
    "costsComplete" BOOLEAN,
    "openedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "instrumentSpec" JSONB,
    "provenance" JSONB,
    "calculationVersion" VARCHAR(32),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePerformance_pkey" PRIMARY KEY ("tradeId")
);

-- CreateTable
CREATE TABLE "TradeExecution" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "ExecutionKind" NOT NULL,
    "price" DECIMAL(38,18),
    "quantity" DECIMAL(38,18),
    "executedAt" TIMESTAMPTZ(3),
    "sequence" INTEGER,
    "fxRateToAccount" DECIMAL(38,18),
    "fxEvidence" JSONB,
    "provider" VARCHAR(80),
    "externalDealId" VARCHAR(160),
    "externalOrderId" VARCHAR(160),
    "externalPositionId" VARCHAR(160),

    CONSTRAINT "TradeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCharge" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "executionId" TEXT,
    "kind" "ChargeKind" NOT NULL,
    "amount" DECIMAL(38,12),
    "unitKey" VARCHAR(160),
    "occurredAt" TIMESTAMPTZ(3),
    "fxRateToAccount" DECIMAL(38,18),
    "fxEvidence" JSONB,
    "provider" VARCHAR(80),
    "externalComponentId" VARCHAR(160),

    CONSTRAINT "TradeCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradePerformance_accountId_closedAt_idx" ON "TradePerformance"("accountId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradePerformance_tradeId_accountId_key" ON "TradePerformance"("tradeId", "accountId");

-- CreateIndex
CREATE INDEX "TradeExecution_tradeId_executedAt_sequence_idx" ON "TradeExecution"("tradeId", "executedAt", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TradeExecution_id_tradeId_accountId_key" ON "TradeExecution"("id", "tradeId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeExecution_accountId_provider_externalDealId_key" ON "TradeExecution"("accountId", "provider", "externalDealId");

-- CreateIndex
CREATE INDEX "TradeCharge_tradeId_occurredAt_idx" ON "TradeCharge"("tradeId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCharge_accountId_provider_externalComponentId_key" ON "TradeCharge"("accountId", "provider", "externalComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_id_userId_key" ON "TradingAccount"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_id_settlementUnitKey_key" ON "TradingAccount"("id", "settlementUnitKey");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_id_accountId_key" ON "Trade"("id", "accountId");

-- AddForeignKey
ALTER TABLE "TradingAccount" ADD CONSTRAINT "TradingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_userId_fkey" FOREIGN KEY ("accountId", "userId") REFERENCES "TradingAccount"("id", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TradePerformance" ADD CONSTRAINT "TradePerformance_tradeId_accountId_fkey" FOREIGN KEY ("tradeId", "accountId") REFERENCES "Trade"("id", "accountId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TradePerformance" ADD CONSTRAINT "TradePerformance_accountId_moneyUnitKey_fkey" FOREIGN KEY ("accountId", "moneyUnitKey") REFERENCES "TradingAccount"("id", "settlementUnitKey") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TradeExecution" ADD CONSTRAINT "TradeExecution_tradeId_accountId_fkey" FOREIGN KEY ("tradeId", "accountId") REFERENCES "TradePerformance"("tradeId", "accountId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TradeCharge" ADD CONSTRAINT "TradeCharge_tradeId_accountId_fkey" FOREIGN KEY ("tradeId", "accountId") REFERENCES "TradePerformance"("tradeId", "accountId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TradeCharge" ADD CONSTRAINT "TradeCharge_executionId_tradeId_accountId_fkey" FOREIGN KEY ("executionId", "tradeId", "accountId") REFERENCES "TradeExecution"("id", "tradeId", "accountId") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- Hand-reviewed PostgreSQL-only constraints, not represented by Prisma schema diff.
CREATE UNIQUE INDEX "TradingAccount_one_current_per_user" ON "TradingAccount" ("userId") WHERE "isCurrent";
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_revision_nonnegative" CHECK (revision>=0);
ALTER TABLE "TradingAccount" ADD CONSTRAINT "Account_denomination" CHECK ("unitsPerMajor" IS NULL OR ("unitsPerMajor">0 AND "unitsPerMajor"::text<>'NaN' AND "settlementUnitKey" IS NOT NULL));
ALTER TABLE "TradingAccount" ADD CONSTRAINT "Account_unit_key" CHECK ("settlementUnitKey" IS NULL OR "settlementUnitKey" ~ '^(ISO:[A-Z]{3}|TOKEN:[A-Za-z0-9._:-]+|BROKER:[A-Za-z0-9._:-]+)$');
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_unit_required" CHECK (("initialRiskAmount" IS NULL AND "reportedGrossPnl" IS NULL AND "reportedNetPnl" IS NULL) OR "moneyUnitKey" IS NOT NULL);
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_risk_positive" CHECK ("initialRiskAmount" IS NULL OR ("initialRiskAmount">0 AND "initialRiskAmount"::text<>'NaN'));
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_finite" CHECK (("reportedGrossPnl" IS NULL OR "reportedGrossPnl"::text<>'NaN') AND ("reportedNetPnl" IS NULL OR "reportedNetPnl"::text<>'NaN'));
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_dates" CHECK ((status IS NULL OR source IS NOT NULL) AND ("closedAt" IS NULL OR status='CLOSED') AND ("openedAt" IS NULL OR "closedAt" IS NULL OR "closedAt">="openedAt"));
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_no_manual_execution_total" CHECK (source IS DISTINCT FROM 'EXECUTIONS' OR ("reportedGrossPnl" IS NULL AND "reportedNetPnl" IS NULL));
ALTER TABLE "TradePerformance" ADD CONSTRAINT "Performance_json_bound" CHECK (("instrumentSpec" IS NULL OR (jsonb_typeof("instrumentSpec")='object' AND octet_length("instrumentSpec"::text)<=65536)) AND (provenance IS NULL OR (jsonb_typeof(provenance)='object' AND octet_length(provenance::text)<=65536)));
ALTER TABLE "TradeExecution" ADD CONSTRAINT "Execution_numbers" CHECK ((quantity IS NULL OR (quantity>0 AND quantity::text<>'NaN')) AND (price IS NULL OR price::text<>'NaN') AND (sequence IS NULL OR sequence>=0) AND ("fxRateToAccount" IS NULL OR ("fxRateToAccount">0 AND "fxRateToAccount"::text<>'NaN' AND "fxEvidence" IS NOT NULL)));
ALTER TABLE "TradeExecution" ADD CONSTRAINT "Execution_external_identity" CHECK ("externalDealId" IS NULL OR (provider IS NOT NULL AND length(provider)>0 AND length("externalDealId")>0));
ALTER TABLE "TradeExecution" ADD CONSTRAINT "Execution_fx_bound" CHECK ("fxEvidence" IS NULL OR (jsonb_typeof("fxEvidence")='object' AND octet_length("fxEvidence"::text)<=65536));
ALTER TABLE "TradeCharge" ADD CONSTRAINT "Charge_numbers" CHECK ((amount IS NULL OR (amount::text<>'NaN' AND "unitKey" IS NOT NULL)) AND ("fxRateToAccount" IS NULL OR ("fxRateToAccount">0 AND "fxRateToAccount"::text<>'NaN' AND "fxEvidence" IS NOT NULL)));
ALTER TABLE "TradeCharge" ADD CONSTRAINT "Charge_external_identity" CHECK ("externalComponentId" IS NULL OR (provider IS NOT NULL AND length(provider)>0 AND length("externalComponentId")>0));
ALTER TABLE "TradeCharge" ADD CONSTRAINT "Charge_fx_bound" CHECK ("fxEvidence" IS NULL OR (jsonb_typeof("fxEvidence")='object' AND octet_length("fxEvidence"::text)<=65536));
-- Prevent scale relabeling once any performance aggregate exists, including null-unit drafts.
CREATE FUNCTION v11_freeze_account_denomination() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW."settlementUnitKey" IS DISTINCT FROM OLD."settlementUnitKey" OR NEW."unitsPerMajor" IS DISTINCT FROM OLD."unitsPerMajor")
 AND EXISTS (SELECT 1 FROM "TradePerformance" WHERE "accountId"=OLD.id) THEN
  RAISE EXCEPTION 'V11_ACCOUNT_DENOMINATION_FROZEN' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v11_freeze_account_denomination BEFORE UPDATE ON "TradingAccount" FOR EACH ROW EXECUTE FUNCTION v11_freeze_account_denomination();

ALTER TABLE "Trade" ADD CONSTRAINT "Trade_prices_finite" CHECK (entry::text<>'NaN' AND sl::text<>'NaN' AND tp::text<>'NaN');
ALTER TABLE "TradeCharge" ADD CONSTRAINT "Charge_unit_key" CHECK ("unitKey" IS NULL OR "unitKey" ~ '^(ISO:[A-Z]{3}|TOKEN:[A-Za-z0-9._:-]+|BROKER:[A-Za-z0-9._:-]+)$');

ALTER TABLE "TradingAccount" ADD COLUMN "denominationEvidence" JSONB;
ALTER TABLE "TradingAccount" ADD CONSTRAINT "Account_evidence_bound" CHECK ("denominationEvidence" IS NULL OR (jsonb_typeof("denominationEvidence")='object' AND octet_length("denominationEvidence"::text)<=65536));
COMMIT;
