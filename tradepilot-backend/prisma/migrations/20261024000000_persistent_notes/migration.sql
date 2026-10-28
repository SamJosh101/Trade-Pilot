BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';

CREATE TABLE "NoteFolder" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "name" VARCHAR(120) NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "NoteFolder_revision_nonnegative" CHECK ("revision">=0),
 CONSTRAINT "NoteFolder_name_valid" CHECK (length(btrim("name")) BETWEEN 1 AND 120),
 CONSTRAINT "NoteFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "NoteFolder_id_userId_key" ON "NoteFolder"("id","userId");
CREATE UNIQUE INDEX "NoteFolder_userId_name_key" ON "NoteFolder"("userId","name");
CREATE INDEX "NoteFolder_userId_name_id_idx" ON "NoteFolder"("userId","name","id");

CREATE TABLE "Note" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "folderId" TEXT, "accountId" TEXT, "tradeId" TEXT, "dayDate" VARCHAR(10),
 "title" VARCHAR(160) NOT NULL, "body" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "Note_revision_nonnegative" CHECK ("revision">=0),
 CONSTRAINT "Note_text_valid" CHECK (length(btrim("title")) BETWEEN 1 AND 160 AND length("body")<=30000),
 CONSTRAINT "Note_associations_valid" CHECK (("tradeId" IS NULL OR "accountId" IS NOT NULL) AND ("dayDate" IS NULL OR ("accountId" IS NOT NULL AND "dayDate" ~ '^\d{4}-\d{2}-\d{2}$' AND to_char("dayDate"::date,'YYYY-MM-DD')="dayDate"))),
 CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Note_folderId_userId_fkey" FOREIGN KEY ("folderId","userId") REFERENCES "NoteFolder"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Note_accountId_userId_fkey" FOREIGN KEY ("accountId","userId") REFERENCES "TradingAccount"("id","userId") ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT "Note_tradeId_accountId_fkey" FOREIGN KEY ("tradeId","accountId") REFERENCES "Trade"("id","accountId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE INDEX "Note_userId_updatedAt_id_idx" ON "Note"("userId","updatedAt","id");
CREATE INDEX "Note_userId_folderId_updatedAt_id_idx" ON "Note"("userId","folderId","updatedAt","id");
CREATE INDEX "Note_userId_accountId_dayDate_idx" ON "Note"("userId","accountId","dayDate");
CREATE INDEX "Note_tradeId_accountId_idx" ON "Note"("tradeId","accountId");

CREATE TABLE "NoteImportReceipt" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "key" VARCHAR(128) NOT NULL, "fingerprint" VARCHAR(64) NOT NULL,
 "referenceNoteId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "NoteImportReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "NoteImportReceipt_userId_key_key" ON "NoteImportReceipt"("userId","key");
COMMIT;
