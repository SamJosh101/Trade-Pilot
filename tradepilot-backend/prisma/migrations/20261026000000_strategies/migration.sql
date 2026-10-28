BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TABLE "Strategy" (
 "id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"name" VARCHAR(160) NOT NULL,"description" VARCHAR(5000) NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0,"archivedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ(3) NOT NULL,
 "requestKey" VARCHAR(36),"creationHash" VARCHAR(64),
 CONSTRAINT "Strategy_valid" CHECK(length(btrim("name"))>0 AND "revision">=0),
 CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "Strategy_id_userId_key" ON "Strategy"("id","userId");
CREATE UNIQUE INDEX "Strategy_userId_requestKey_key" ON "Strategy"("userId","requestKey");
CREATE INDEX "Strategy_userId_archivedAt_updatedAt_id_idx" ON "Strategy"("userId","archivedAt","updatedAt","id");
CREATE TABLE "TradeStrategyAssignment" (
 "id" TEXT NOT NULL PRIMARY KEY,"userId" TEXT NOT NULL,"tradeId" TEXT NOT NULL,"accountId" TEXT NOT NULL,"strategyId" TEXT NOT NULL,
 "strategyRevision" INTEGER NOT NULL,"strategyName" VARCHAR(160) NOT NULL,"strategyDescription" VARCHAR(5000) NOT NULL,
 "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"endedAt" TIMESTAMPTZ(3),
 CONSTRAINT "StrategyAssignment_valid" CHECK("strategyRevision">=0 AND length(btrim("strategyName"))>0 AND ("endedAt" IS NULL OR "endedAt">="assignedAt")),
 CONSTRAINT "TradeStrategyAssignment_tradeId_accountId_userId_fkey" FOREIGN KEY("tradeId","accountId","userId") REFERENCES "Trade"("id","accountId","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "TradeStrategyAssignment_strategyId_userId_fkey" FOREIGN KEY("strategyId","userId") REFERENCES "Strategy"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "TradeStrategyAssignment_accountId_userId_fkey" FOREIGN KEY("accountId","userId") REFERENCES "TradingAccount"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "TradeStrategyAssignment_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "TradeStrategyAssignment_userId_tradeId_assignedAt_id_idx" ON "TradeStrategyAssignment"("userId","tradeId","assignedAt","id");
CREATE INDEX "TradeStrategyAssignment_userId_accountId_strategyId_endedAt_idx" ON "TradeStrategyAssignment"("userId","accountId","strategyId","endedAt");
CREATE INDEX "TradeStrategyAssignment_strategyId_userId_idx" ON "TradeStrategyAssignment"("strategyId","userId");
CREATE UNIQUE INDEX "TradeStrategyAssignment_one_current" ON "TradeStrategyAssignment"("tradeId") WHERE "endedAt" IS NULL;
CREATE FUNCTION strategy_assignment_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id,NEW."userId",NEW."tradeId",NEW."accountId",NEW."strategyId",NEW."strategyRevision",NEW."strategyName",NEW."strategyDescription",NEW."assignedAt") IS DISTINCT FROM (OLD.id,OLD."userId",OLD."tradeId",OLD."accountId",OLD."strategyId",OLD."strategyRevision",OLD."strategyName",OLD."strategyDescription",OLD."assignedAt") OR OLD."endedAt" IS NOT NULL OR NEW."endedAt" IS NULL THEN
  RAISE EXCEPTION 'Strategy history is immutable; only ending the current assignment is allowed' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER strategy_assignment_immutable BEFORE UPDATE ON "TradeStrategyAssignment" FOR EACH ROW EXECUTE FUNCTION strategy_assignment_immutable();
COMMIT;
