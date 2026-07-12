import {
  assignActivePartnerTiers,
  getActivePartnersDisplayCount,
  pickTierByWeight,
  pickWeightedActivePartners,
  ActivePartnerPickItem,
  TIER_WEIGHTS,
} from './pick-weighted-active-partners.util';

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

function buildPool(count: number): ActivePartnerPickItem[] {
  return Array.from({ length: count }, (_, index) => ({
    stakeholderUserId: `p${index + 1}`,
    name: `Partner ${index + 1}`,
    totalEngagementAmount: count - index,
  }));
}

describe('assignActivePartnerTiers', () => {
  it('assigns tier boundaries for N=1', () => {
    expect(assignActivePartnerTiers(1)).toEqual([0]);
  });

  it('assigns tier boundaries for N=5', () => {
    expect(assignActivePartnerTiers(5)).toEqual([0, 1, 1, 2, 2]);
  });

  it('assigns tier boundaries for N=10', () => {
    expect(assignActivePartnerTiers(10)).toEqual([0, 0, 1, 1, 1, 2, 2, 2, 2, 2]);
  });

  it('assigns tier boundaries for N=100', () => {
    const tiers = assignActivePartnerTiers(100);
    expect(tiers.slice(0, 20).every((tier) => tier === 0)).toBe(true);
    expect(tiers.slice(20, 50).every((tier) => tier === 1)).toBe(true);
    expect(tiers.slice(50).every((tier) => tier === 2)).toBe(true);
  });
});

describe('pickTierByWeight', () => {
  it('returns the only available tier', () => {
    expect(pickTierByWeight([2], () => 0.99)).toBe(2);
  });

  it('picks tier A when random is near 0', () => {
    expect(pickTierByWeight([0, 1, 2], () => 0)).toBe(0);
  });

  it('picks tier C when random is near 1', () => {
    expect(pickTierByWeight([0, 1, 2], () => 0.999)).toBe(2);
  });

  it('renormalizes among available tiers', () => {
    expect(pickTierByWeight([1, 2], () => 0)).toBe(1);
    const tierBWeight = TIER_WEIGHTS[1];
    const tierCWeight = TIER_WEIGHTS[2];
    const tierCRoll = tierBWeight / (tierBWeight + tierCWeight) + 0.001;
    expect(pickTierByWeight([1, 2], () => tierCRoll)).toBe(2);
  });
});

describe('pickWeightedActivePartners', () => {
  const pool: ActivePartnerPickItem[] = [
    { stakeholderUserId: 'p1', name: 'A', totalEngagementAmount: 1000 },
    { stakeholderUserId: 'p2', name: 'B', totalEngagementAmount: 500 },
    { stakeholderUserId: 'p3', name: 'C', totalEngagementAmount: 200 },
    { stakeholderUserId: 'p4', name: 'D', totalEngagementAmount: 100 },
    { stakeholderUserId: 'p5', name: 'E', totalEngagementAmount: 50 },
    { stakeholderUserId: 'p6', name: 'F', totalEngagementAmount: 25 },
  ];

  it('returns empty array for empty pool', () => {
    expect(pickWeightedActivePartners([])).toEqual([]);
  });

  it('returns all items when pool is smaller than minimum display count', () => {
    const smallPool = pool.slice(0, 2);
    const result = pickWeightedActivePartners(smallPool, () => 0);
    expect(result.length).toBe(2);
    expect(result.map((partner) => partner.stakeholderUserId).sort()).toEqual(['p1', 'p2']);
  });

  it('picks up to 5 items from a larger pool', () => {
    const result = pickWeightedActivePartners(pool, () => 0);
    expect(result.length).toBe(5);
    expect(new Set(result.map((partner) => partner.stakeholderUserId)).size).toBe(5);
  });

  it('favors top of tier A when random is near 0', () => {
    const result = pickWeightedActivePartners(pool, () => 0);
    expect(result[0]?.stakeholderUserId).toBe('p1');
  });

  it('can select a bottom-tier partner with a controlled random sequence', () => {
    const largePool = buildPool(10);
    const result = pickWeightedActivePartners(largePool, sequenceRandom([0.8, 0]));
    expect(result[0]?.stakeholderUserId).toBe('p6');
  });

  it('renormalizes tier weights when a tier is exhausted', () => {
    const mediumPool = buildPool(6);
    const result = pickWeightedActivePartners(mediumPool, () => 0);
    expect(result.map((partner) => partner.stakeholderUserId)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
    ]);
  });

  it('does not return duplicate stakeholderUserId values', () => {
    const result = pickWeightedActivePartners(buildPool(20), sequenceRandom(Array(20).fill(0.5)));
    expect(new Set(result.map((partner) => partner.stakeholderUserId)).size).toBe(result.length);
  });

  it('stops early when all remaining engagement is zero', () => {
    const zeroPool: ActivePartnerPickItem[] = [
      { stakeholderUserId: 'p1', name: 'A', totalEngagementAmount: 100 },
      { stakeholderUserId: 'p2', name: 'B', totalEngagementAmount: 0 },
      { stakeholderUserId: 'p3', name: 'C', totalEngagementAmount: 0 },
      { stakeholderUserId: 'p4', name: 'D', totalEngagementAmount: 0 },
    ];
    const result = pickWeightedActivePartners(zeroPool, () => 0);
    expect(result.length).toBe(1);
    expect(result[0]?.stakeholderUserId).toBe('p1');
  });

  it('getActivePartnersDisplayCount follows min/max rules', () => {
    expect(getActivePartnersDisplayCount(0)).toBe(0);
    expect(getActivePartnersDisplayCount(2)).toBe(2);
    expect(getActivePartnersDisplayCount(3)).toBe(3);
    expect(getActivePartnersDisplayCount(10)).toBe(5);
  });
});
