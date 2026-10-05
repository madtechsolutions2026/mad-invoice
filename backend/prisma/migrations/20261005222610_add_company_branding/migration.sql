-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "authorizedSignatoryDesignation" TEXT DEFAULT 'Authorized Signatory',
ADD COLUMN     "authorizedSignatoryName" TEXT,
ADD COLUMN     "logoStorageKey" TEXT,
ADD COLUMN     "stampStorageKey" TEXT;
