-- Development-only additive query indexes. Rehearsed exclusively on synthetic targets.
-- Production deployment needs separate lock/build review; do not run from an API.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
CREATE INDEX "Trade_userId_accountId_createdAt_id_idx" ON "Trade"("userId","accountId","createdAt",id);
CREATE INDEX "Trade_userId_accountId_pair_id_idx" ON "Trade"("userId","accountId",pair,id);
COMMIT;
