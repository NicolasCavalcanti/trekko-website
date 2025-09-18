import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PrismaClient as PrismaClientType, Region } from '@trekko/prisma';

type StateSeed = {
  id: number;
  code: string;
  name: string;
  region: Region;
};

type CitySeed = {
  id: number;
  stateCode: string;
  name: string;
  isCapital?: boolean;
};

const { PrismaClient } = require(join(__dirname, '..', '..', 'generated', 'prisma')) as typeof import('@trekko/prisma');

const prisma: PrismaClientType = new PrismaClient();

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const dataDir = join(__dirname, '..', 'data');

const loadJson = <T>(filename: string): T => {
  const filePath = join(dataDir, filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
};

const chunk = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

async function seedStates(states: StateSeed[]) {
  await prisma.state.updateMany({ data: { capitalCityId: null } });
  await prisma.city.deleteMany();
  await prisma.state.deleteMany();

  await prisma.$transaction(
    states.map((state) =>
      prisma.state.create({
        data: {
          id: state.id,
          code: state.code,
          name: state.name,
          region: state.region,
        },
      })
    )
  );
}

async function seedCities(states: StateSeed[], cities: CitySeed[]) {
  const stateByCode = new Map(states.map((state) => [state.code, state.id]));

  const cityData = cities.map((city) => {
    const stateId = stateByCode.get(city.stateCode);
    if (!stateId) {
      throw new Error(`State code ${city.stateCode} not found for city ${city.name}`);
    }

    return {
      id: city.id,
      stateId,
      name: city.name,
      slug: slugify(city.name),
      isCapital: Boolean(city.isCapital),
    };
  });

  for (const group of chunk(cityData, 100)) {
    await prisma.city.createMany({ data: group, skipDuplicates: true });
  }

  for (const state of states) {
    const capital = await prisma.city.findFirst({
      where: {
        stateId: state.id,
        isCapital: true,
      },
      select: { id: true },
    });

    if (capital) {
      await prisma.state.update({
        where: { id: state.id },
        data: { capitalCityId: capital.id },
      });
    }
  }
}

async function main() {
  const states = loadJson<StateSeed[]>('states.json');
  const cities = loadJson<CitySeed[]>('cities.json');

  await seedStates(states);
  await seedCities(states, cities);

  const stateCount = await prisma.state.count();
  const cityCount = await prisma.city.count();

  console.info(`✅ Seed completed with ${stateCount} states and ${cityCount} cities.`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
