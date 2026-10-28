-- AlterTable
ALTER TABLE "TradingAccount" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "brokerId" TEXT,
ADD COLUMN     "brokerLogo" TEXT,
ADD COLUMN     "brokerName" TEXT,
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TradingAccount_userId_isCurrent_idx" ON "TradingAccount"("userId", "isCurrent");
