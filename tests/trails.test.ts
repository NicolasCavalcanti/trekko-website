import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import { GET } from '../app/api/trails/route';

// This test ensures that coverImageUrl is returned when a cover media exists.
test('GET /api/trails includes coverImageUrl', async () => {
  const trail = await prisma.trail.create({
    data: {
      name: 'Test Trail',
      state: 'MG',
      city: 'Test City',
      regionOrPark: 'Test Region',
      distanceKm: 1,
      elevationGainM: 0,
      difficulty: 'EASY',
      requiresGuide: false,
    },
  });
  await prisma.media.create({
    data: {
      trailId: trail.id,
      url: 'https://example.com/cover.jpg',
      type: 'image',
      isCover: true,
    },
  });

  const req = new NextRequest('http://localhost/api/trails?page=1&pageSize=10');
  const res = await GET(req);
  const json = await res.json();
  assert.equal(json.items[0].coverImageUrl, 'https://example.com/cover.jpg');
});
