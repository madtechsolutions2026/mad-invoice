-- CreateTable
CREATE TABLE "customer_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DECIMAL(15,4) NOT NULL,
    "defaultDescription" TEXT NOT NULL,
    "hsnSac" TEXT NOT NULL DEFAULT '9983',
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    CONSTRAINT "customer_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_group_members_groupId_customerId_key" ON "customer_group_members"("groupId", "customerId");

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_group_members" ADD CONSTRAINT "customer_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "customer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_group_members" ADD CONSTRAINT "customer_group_members_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
