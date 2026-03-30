const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true,
});

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

  const stoneFungus = await prisma.category.upsert({
    where: { id: 3 },
    update: { name: 'Stone Fungus', position: 3 },
    create: {
      id: 3,
      name: 'Stone Fungus',
      position: 3,
      products: {
        create: [
          {
            name: 'Enoki',
            description:
              'Hongo Enoki, Berenjena Asada, Tomate Cherry',
            price: 12900.0,
          },
          {
            name: 'Leonera',
            description:
              'Hongo Melena de León, Rösti de Papa, Cebolla',
            price: 15400.0,
          },
          {
            name: 'Porcina',
            description: 'Hongo Champiñón Paris, Tocino, Salame',
            price: 14200.0,
          },
          {
            name: 'Carnita',
            description:
              'Carne Mechada, Cebolla Stout (cebolla caramelizada en cerveza stout), Pastelera de Choclo',
            price: 15800.0,
          },
          {
            name: 'Veggie',
            description:
              'Tomate Cherry, Albahaca, Cebolla Caramelizada',
            price: 11800.0,
          },
          {
            name: 'Napolitana',
            description: 'Jamón',
            price: 12500.0,
          },
        ],
      },
    },
  });

  console.log('Seed OK', { burgers, drinks, stoneFungus });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
