-- Development-only additive security storage. Separate approval required for any real target.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TABLE "AuthSecurityState" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE RESTRICT,
 "denyLegacy" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "AuthSession" (
 id TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 kind VARCHAR(16) NOT NULL CHECK(kind::text IN ('MANAGED'::text,'LEGACY'::text)),
 label VARCHAR(120) NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,"revokedAt" TIMESTAMPTZ(3),
 CONSTRAINT "AuthSession_expiry" CHECK("expiresAt">"createdAt")
);
CREATE INDEX "AuthSession_owner_expiry" ON "AuthSession"("userId","expiresAt",id);
CREATE TABLE "PasswordResetToken" (
 hash CHAR(64) PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
 "passwordFingerprint" CHAR(64) NOT NULL,"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,"consumedAt" TIMESTAMPTZ(3),
 CONSTRAINT "PasswordReset_expiry" CHECK("expiresAt">"createdAt")
);
CREATE INDEX "PasswordReset_owner_expiry" ON "PasswordResetToken"("userId","expiresAt");
COMMIT;
