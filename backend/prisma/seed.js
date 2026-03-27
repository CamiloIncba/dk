const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const burgers = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Hamburguesas',
      position: 1,
      products: {
        create: [
          {
            name: 'Hamburguesa Clásica',
            description: 'Carne, queso, lechuga, tomate',
            price: 3500.0,
          },
          {
            name: 'Hamburguesa Doble',
            description: 'Doble carne, doble queso',
            price: 4500.0,
          },
        ],
      },
    },
  });

  const drinks = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Bebidas',
      position: 2,
      products: {
        create: [
          {
            name: 'Gaseosa Lata',
            description: '330 ml',
            price: 1000.0,
          },
          {
            name: 'Agua Mineral',
            description: '500 ml',
            price: 800.0,
          },
        ],
      },
    },
  });

  console.log('Seed OK', { burgers, drinks });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
