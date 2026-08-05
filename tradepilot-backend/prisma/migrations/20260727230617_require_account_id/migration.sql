/*
  Warnings:

  - Made the column `accountId` on table `Trade` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Trade" ALTER COLUMN "accountId" SET NOT NULL;
