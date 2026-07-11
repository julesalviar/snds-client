import {
  getParticipatingPartnersDisplayCount,
  pickWeightedParticipatingPartners,
  ParticipatingPartnerPickItem,
} from './pick-weighted-participating-partners.util';

describe('pickWeightedParticipatingPartners', () => {
  const pool: ParticipatingPartnerPickItem[] = [
    { stakeholderUserId: 'a', name: 'A', totalEngagementAmount: 1000 },
    { stakeholderUserId: 'b', name: 'B', totalEngagementAmount: 100 },
    { stakeholderUserId: 'c', name: 'C', totalEngagementAmount: 50 },
    { stakeholderUserId: 'd', name: 'D', totalEngagementAmount: 25 },
    { stakeholderUserId: 'e', name: 'E', totalEngagementAmount: 10 },
    { stakeholderUserId: 'f', name: 'F', totalEngagementAmount: 5 },
  ];

  it('returns empty array for empty pool', () => {
    expect(pickWeightedParticipatingPartners([])).toEqual([]);
  });

  it('returns all partners when pool has fewer than 3', () => {
    const smallPool = pool.slice(0, 2);
    const result = pickWeightedParticipatingPartners(smallPool, () => 0);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.stakeholderUserId).sort()).toEqual(['a', 'b']);
  });

  it('picks up to 5 unique partners when pool is large enough', () => {
    const result = pickWeightedParticipatingPartners(pool, () => 0);
    expect(result).toHaveLength(5);
    const ids = result.map((p) => p.stakeholderUserId);
    expect(new Set(ids).size).toBe(5);
  });

  it('favors higher amounts when random is near total weight', () => {
    const result = pickWeightedParticipatingPartners(pool, () => 0.999);
    expect(result[0].stakeholderUserId).toBe('a');
  });

  it('getParticipatingPartnersDisplayCount follows min/max rules', () => {
    expect(getParticipatingPartnersDisplayCount(0)).toBe(0);
    expect(getParticipatingPartnersDisplayCount(2)).toBe(2);
    expect(getParticipatingPartnersDisplayCount(3)).toBe(3);
    expect(getParticipatingPartnersDisplayCount(10)).toBe(5);
  });
});
