import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { slug: "sample-product" },
    update: {},
    create: {
      slug: "sample-product",
      name: "Sample Product",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
