import {
  getActivePartnersDisplayCount,
  pickWeightedActivePartners,
  ActivePartnerPickItem,
} from './pick-weighted-active-partners.util';

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
    expect(result.map((p) => p.stakeholderUserId).sort()).toEqual(['p1', 'p2']);
  });

  it('picks up to 5 items from a larger pool', () => {
    const result = pickWeightedActivePartners(pool, () => 0);
    expect(result.length).toBe(5);
    expect(new Set(result.map((p) => p.stakeholderUserId)).size).toBe(5);
  });

  it('favors higher engagement amounts when random is near 0', () => {
    const result = pickWeightedActivePartners(pool, () => 0);
    expect(result[0]?.stakeholderUserId).toBe('p1');
  });

  it('getActivePartnersDisplayCount follows min/max rules', () => {
    expect(getActivePartnersDisplayCount(0)).toBe(0);
    expect(getActivePartnersDisplayCount(2)).toBe(2);
    expect(getActivePartnersDisplayCount(3)).toBe(3);
    expect(getActivePartnersDisplayCount(10)).toBe(5);
  });
});
