import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import { GET } from '../app/api/trails/states/route';

// This test ensures grouping by state and returning first trail info

const commonTrail = {
  city: 'Test City',
  regionOrPark: 'Test Region',
  distanceKm: 1,
  elevationGainM: 0,
  difficulty: 'EASY' as const,
  requiresGuide: false,
};

test('GET /api/trails/states returns counts and first trail per state', async () => {
  const mg = await prisma.trail.create({
    data: {
      name: 'MG Trail',
      state: 'MG',
      ...commonTrail,
    },
  });

  const spEarly = await prisma.trail.create({
    data: {
      name: 'SP Early',
      state: 'SP',
      createdAt: new Date('2020-01-01'),
      ...commonTrail,
    },
  });

  await prisma.trail.create({
    data: {
      name: 'SP Late',
      state: 'SP',
      createdAt: new Date('2021-01-01'),
      ...commonTrail,
    },
  });

  await prisma.media.create({
    data: {
      trailId: spEarly.id,
      url: 'https://example.com/cover.jpg',
      type: 'image',
      isCover: true,
    },
  });

  const req = new NextRequest('http://localhost/api/trails/states');
  const res = await GET(req);
  const json = await res.json();

  const mgState = json.items.find((i: any) => i.state === 'MG');
  const spState = json.items.find((i: any) => i.state === 'SP');
  const rjState = json.items.find((i: any) => i.state === 'RJ');

  assert.equal(mgState.count, 1);
  assert.equal(mgState.trailName, 'MG Trail');
  assert.equal(spState.count, 2);
  assert.equal(spState.trailName, 'SP Early');
  assert.equal(spState.coverImageUrl, 'https://example.com/cover.jpg');
  assert.equal(rjState.count, 0);
  assert.equal(rjState.trailName, null);
});
