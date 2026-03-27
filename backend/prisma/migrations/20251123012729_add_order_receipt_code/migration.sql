/*
  Warnings:

  - A unique constraint covering the columns `[receiptCode]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiptCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_receiptCode_key" ON "Order"("receiptCode");
