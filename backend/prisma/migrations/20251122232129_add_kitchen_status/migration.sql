-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('PENDING', 'IN_PREPARATION', 'READY', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kitchenStatus" "KitchenStatus" NOT NULL DEFAULT 'PENDING';
