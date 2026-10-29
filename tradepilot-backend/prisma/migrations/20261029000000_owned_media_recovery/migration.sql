-- Additive only. Explicit operator approval is required before production use.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
-- Recovery must never choose between two case variants of the same mailbox.
-- Stop for explicit owner review; never merge or rewrite existing accounts.
DO $$ BEGIN
 IF EXISTS(SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Case-variant email identities require review; no accounts changed'; END IF;
END $$;
CREATE UNIQUE INDEX "User_email_casefold_key" ON "User"(lower(email));
CREATE TABLE "MediaAsset" (
 id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, purpose VARCHAR(16) NOT NULL,
 "targetKey" VARCHAR(128) NOT NULL, "tradeId" TEXT, "accountId" TEXT,
 "requestKey" UUID NOT NULL, fingerprint CHAR(64) NOT NULL,
 "publicId" VARCHAR(200) NOT NULL UNIQUE, state VARCHAR(16) NOT NULL,
 bytes INTEGER NOT NULL DEFAULT 5242880, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
 CONSTRAINT "Media_user" FOREIGN KEY("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Media_trade_owner" FOREIGN KEY("tradeId","accountId","userId") REFERENCES "Trade"(id,"accountId","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Media_state" CHECK((state='PENDING' OR state='READY' OR state='RETIRED' OR state='DELETED')),
 CONSTRAINT "Media_size" CHECK(bytes BETWEEN 1 AND 5242880),
 CONSTRAINT "Media_target" CHECK((purpose='AVATAR' AND "targetKey"='profile' AND "tradeId" IS NULL AND "accountId" IS NULL) OR (purpose='SCREENSHOT' AND "targetKey" LIKE 'trade:%' AND (("tradeId" IS NOT NULL AND "accountId" IS NOT NULL AND "targetKey"='trade:'||"tradeId") OR ((state='RETIRED' OR state='DELETED') AND "tradeId" IS NULL AND "accountId" IS NULL)))),
 UNIQUE("userId","requestKey")
);
CREATE UNIQUE INDEX "Media_current_target" ON "MediaAsset"("userId","targetKey") WHERE state='READY';
CREATE INDEX "Media_cleanup" ON "MediaAsset"(state,"updatedAt",id);
CREATE INDEX "Media_trade" ON "MediaAsset"("tradeId","accountId","userId");
CREATE TABLE "FeatureUsage" (key VARCHAR(160) PRIMARY KEY, amount BIGINT NOT NULL CHECK(amount>=0));
CREATE TABLE "RecoveryDelivery" (
 id UUID PRIMARY KEY, "recipientHash" CHAR(64) NOT NULL,
 "userId" TEXT, "tokenHash" CHAR(64), ciphertext TEXT,
 state VARCHAR(16) NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "leaseUntil" TIMESTAMPTZ(3), "finishedAt" TIMESTAMPTZ(3),
 CONSTRAINT "RecoveryDelivery_user" FOREIGN KEY("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "RecoveryDelivery_token" FOREIGN KEY("tokenHash") REFERENCES "PasswordResetToken"(hash) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "RecoveryDelivery_state" CHECK((state='PENDING' OR state='SENDING' OR state='SENT' OR state='FAILED' OR state='SKIPPED')),
 CONSTRAINT "RecoveryDelivery_attempts" CHECK(attempts BETWEEN 0 AND 3),
 CONSTRAINT "RecoveryDelivery_expiry" CHECK("expiresAt">"createdAt")
);
CREATE INDEX "RecoveryDelivery_recipient" ON "RecoveryDelivery"("recipientHash","createdAt");
CREATE INDEX "RecoveryDelivery_queue" ON "RecoveryDelivery"(state,"createdAt");
COMMIT;
