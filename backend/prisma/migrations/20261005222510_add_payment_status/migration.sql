-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "paymentAmount" DECIMAL(15,4),
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
