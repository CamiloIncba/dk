-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('IN_STORE', 'WEB_STORE', 'PEDIDOS_YA', 'UBER_EATS', 'WHATSAPP');

-- AlterEnum
ALTER TYPE "KitchenStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'IN_STORE';

-- AlterTable
ALTER TABLE "PaymentLog" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualApprovedBy" TEXT,
ADD COLUMN     "manualNotes" TEXT,
ADD COLUMN     "manualReason" TEXT;

-- CreateTable
CREATE TABLE "ExtraGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExtraGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExtraOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductExtraGroup" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER,

    CONSTRAINT "ProductExtraGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductExtraOption" (
    "id" SERIAL NOT NULL,
    "productExtraGroupId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "priceOverride" DECIMAL(10,2),

    CONSTRAINT "ProductExtraOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusLog" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "changedBy" TEXT,
    "source" TEXT NOT NULL,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemExtra" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "extraOptionId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductExtraGroup_productId_groupId_key" ON "ProductExtraGroup"("productId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductExtraOption_productExtraGroupId_optionId_key" ON "ProductExtraOption"("productExtraGroupId", "optionId");

-- AddForeignKey
ALTER TABLE "ExtraOption" ADD CONSTRAINT "ExtraOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ExtraGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtraGroup" ADD CONSTRAINT "ProductExtraGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ExtraGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtraGroup" ADD CONSTRAINT "ProductExtraGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtraOption" ADD CONSTRAINT "ProductExtraOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ExtraOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtraOption" ADD CONSTRAINT "ProductExtraOption_productExtraGroupId_fkey" FOREIGN KEY ("productExtraGroupId") REFERENCES "ProductExtraGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusLog" ADD CONSTRAINT "OrderStatusLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemExtra" ADD CONSTRAINT "OrderItemExtra_extraOptionId_fkey" FOREIGN KEY ("extraOptionId") REFERENCES "ExtraOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemExtra" ADD CONSTRAINT "OrderItemExtra_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
