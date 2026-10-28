BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE UNIQUE INDEX "Trade_id_accountId_userId_key" ON "Trade"("id","accountId","userId");
CREATE TABLE "Gameplan" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "name" VARCHAR(160) NOT NULL, "description" VARCHAR(5000) NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0, "archivedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 "requestKey" VARCHAR(36), "creationHash" VARCHAR(64),
 CONSTRAINT "Gameplan_valid" CHECK (length(btrim("name"))>0 AND "revision">=0),
 CONSTRAINT "Gameplan_userId_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "Gameplan_id_userId_key" ON "Gameplan"("id","userId");
CREATE UNIQUE INDEX "Gameplan_userId_requestKey_key" ON "Gameplan"("userId","requestKey");
CREATE INDEX "Gameplan_userId_archivedAt_updatedAt_id_idx" ON "Gameplan"("userId","archivedAt","updatedAt","id");
CREATE TABLE "GameplanItem" (
 "id" TEXT NOT NULL PRIMARY KEY,"gameplanId" TEXT NOT NULL,"userId" TEXT NOT NULL,
 "label" VARCHAR(500) NOT NULL,"position" INTEGER NOT NULL,"required" BOOLEAN NOT NULL DEFAULT false,
 CONSTRAINT "GameplanItem_valid" CHECK (length(btrim("label"))>0 AND "position" BETWEEN 0 AND 99),
 CONSTRAINT "GameplanItem_gameplanId_userId_fkey" FOREIGN KEY("gameplanId","userId") REFERENCES "Gameplan"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "GameplanItem_gameplanId_position_key" ON "GameplanItem"("gameplanId","position");
CREATE TABLE "TradeGameplanSnapshot" (
 "id" TEXT NOT NULL PRIMARY KEY,"tradeId" TEXT NOT NULL,"accountId" TEXT NOT NULL,"userId" TEXT NOT NULL,
 "templateId" TEXT NOT NULL,"templateRevision" INTEGER NOT NULL,"templateName" VARCHAR(160) NOT NULL,"templateDescription" VARCHAR(5000) NOT NULL,
 "itemsJson" JSONB NOT NULL,"answersJson" JSONB NOT NULL,"revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "Snapshot_valid" CHECK ("revision">=0 AND "templateRevision">=0 AND jsonb_typeof("itemsJson")='array' AND jsonb_array_length("itemsJson") BETWEEN 1 AND 100 AND jsonb_typeof("answersJson")='object'),
 CONSTRAINT "Snapshot_trade_owner_fkey" FOREIGN KEY("tradeId","accountId","userId") REFERENCES "Trade"("id","accountId","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Snapshot_user_fkey" FOREIGN KEY("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Snapshot_account_owner_fkey" FOREIGN KEY("accountId","userId") REFERENCES "TradingAccount"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Snapshot_template_owner_fkey" FOREIGN KEY("templateId","userId") REFERENCES "Gameplan"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "TradeGameplanSnapshot_tradeId_key" ON "TradeGameplanSnapshot"("tradeId");
CREATE INDEX "TradeGameplanSnapshot_userId_accountId_tradeId_idx" ON "TradeGameplanSnapshot"("userId","accountId","tradeId");
CREATE UNIQUE INDEX "TradeGameplanSnapshot_tradeId_accountId_userId_key" ON "TradeGameplanSnapshot"("tradeId","accountId","userId");
CREATE INDEX "TradeGameplanSnapshot_templateId_userId_idx" ON "TradeGameplanSnapshot"("templateId","userId");
CREATE FUNCTION gameplan_snapshot_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item jsonb; seen text[] := '{}'; item_id text; expected_position integer := 0;
BEGIN
 IF TG_OP='UPDATE' AND (NEW."id",NEW."tradeId",NEW."accountId",NEW."userId",NEW."templateId",NEW."templateRevision",NEW."templateName",NEW."templateDescription",NEW."itemsJson",NEW."createdAt") IS DISTINCT FROM (OLD."id",OLD."tradeId",OLD."accountId",OLD."userId",OLD."templateId",OLD."templateRevision",OLD."templateName",OLD."templateDescription",OLD."itemsJson",OLD."createdAt") THEN
  RAISE EXCEPTION 'Checklist definitions are immutable' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(NEW."itemsJson")<>'array' OR jsonb_typeof(NEW."answersJson")<>'object' THEN RAISE EXCEPTION 'Invalid checklist' USING ERRCODE='23514'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW."itemsJson") LOOP
  item_id := item->>'id';
  IF item_id IS NULL OR item_id=ANY(seen) OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string' OR length(btrim(item->>'label')) NOT BETWEEN 1 AND 500 OR jsonb_typeof(item->'required') IS DISTINCT FROM 'boolean' OR (item->>'position')::integer IS DISTINCT FROM expected_position OR jsonb_typeof(NEW."answersJson"->item_id) IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'Invalid checklist items or answers' USING ERRCODE='23514';
  END IF;
  seen := array_append(seen,item_id); expected_position := expected_position+1;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_object_keys(NEW."answersJson"))<>expected_position THEN RAISE EXCEPTION 'Unexpected checklist answers' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' AND NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Checklist revision must advance' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gameplan_snapshot_guard BEFORE INSERT OR UPDATE ON "TradeGameplanSnapshot" FOR EACH ROW EXECUTE FUNCTION gameplan_snapshot_guard();
COMMIT;
