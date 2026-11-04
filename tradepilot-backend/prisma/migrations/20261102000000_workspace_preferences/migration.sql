-- Additive owner-scoped UI preferences and metadata. No financial rows are changed.
CREATE TABLE "WorkspaceEntry" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "key" VARCHAR(180) NOT NULL,
  "value" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "key")
);
