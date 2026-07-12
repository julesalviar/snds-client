export interface ActivePartnerPickItem {
  stakeholderUserId: string;
  name: string;
  avatarUrl?: string;
  totalEngagementAmount: number;
}

export const TIER_WEIGHTS = [4 / 9, 3 / 9, 2 / 9] as const;

export type ActivePartnerTier = 0 | 1 | 2;

export interface ActivePartnerTierBounds {
  tierAEnd: number;
  tierBEnd: number;
}

interface ActivePartnerPickCandidate extends ActivePartnerPickItem {
  tier: ActivePartnerTier;
}

export function getActivePartnersDisplayCount(poolLength: number): number {
  if (poolLength === 0) {
    return 0;
  }
  if (poolLength < 3) {
    return poolLength;
  }
  return Math.min(5, poolLength);
}

export function getActivePartnerTierBounds(poolLength: number): ActivePartnerTierBounds {
  return {
    tierAEnd: Math.ceil(poolLength * 0.2),
    tierBEnd: Math.ceil(poolLength * 0.5),
  };
}

export function getActivePartnerTier(
  rankIndex: number,
  bounds: ActivePartnerTierBounds,
): ActivePartnerTier {
  if (rankIndex < bounds.tierAEnd) {
    return 0;
  }
  if (rankIndex < bounds.tierBEnd) {
    return 1;
  }
  return 2;
}

export function assignActivePartnerTiers(poolLength: number): ActivePartnerTier[] {
  const bounds = getActivePartnerTierBounds(poolLength);
  return Array.from({ length: poolLength }, (_, rankIndex) =>
    getActivePartnerTier(rankIndex, bounds),
  );
}

export function pickTierByWeight(
  availableTiers: readonly ActivePartnerTier[],
  random: () => number,
): ActivePartnerTier {
  if (availableTiers.length === 0) {
    throw new Error('No tiers available for selection');
  }
  if (availableTiers.length === 1) {
    return availableTiers[0];
  }

  const tierWeights = availableTiers.map((tier) => TIER_WEIGHTS[tier]);
  const totalTierWeight = tierWeights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * totalTierWeight;

  for (let index = 0; index < tierWeights.length; index++) {
    roll -= tierWeights[index];
    if (roll <= 0) {
      return availableTiers[index];
    }
  }

  return availableTiers[availableTiers.length - 1];
}

function pickEngagementWeighted<T extends ActivePartnerPickItem>(
  candidates: readonly T[],
  random: () => number,
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  const weights = candidates.map((partner) => partner.totalEngagementAmount);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let roll = random() * totalWeight;
  for (let index = 0; index < candidates.length; index++) {
    roll -= weights[index];
    if (roll <= 0) {
      return candidates[index];
    }
  }

  return candidates[candidates.length - 1];
}

function getAvailableTiers(remaining: readonly ActivePartnerPickCandidate[]): ActivePartnerTier[] {
  const tiers = new Set<ActivePartnerTier>();
  for (const partner of remaining) {
    tiers.add(partner.tier);
  }
  return [0, 1, 2].filter((tier) => tiers.has(tier as ActivePartnerTier)) as ActivePartnerTier[];
}

/**
 * Tier-stratified weighted random sample without replacement.
 * Each draw rolls a tier (4/9, 3/9, 2/9), then picks within that tier by engagement.
 */
export function pickWeightedActivePartners(
  pool: readonly ActivePartnerPickItem[],
  random: () => number = Math.random,
): ActivePartnerPickItem[] {
  if (pool.length === 0) {
    return [];
  }

  const sorted = [...pool].sort(
    (left, right) => right.totalEngagementAmount - left.totalEngagementAmount,
  );

  if (sorted.length < 3) {
    return sorted;
  }

  const bounds = getActivePartnerTierBounds(sorted.length);
  const displayCount = getActivePartnersDisplayCount(sorted.length);
  const remaining: ActivePartnerPickCandidate[] = sorted.map((partner, rankIndex) => ({
    ...partner,
    tier: getActivePartnerTier(rankIndex, bounds),
  }));
  const picked: ActivePartnerPickItem[] = [];

  for (let draw = 0; draw < displayCount && remaining.length > 0; draw++) {
    const availableTiers = getAvailableTiers(remaining);
    if (availableTiers.length === 0) {
      break;
    }

    const selectedTier = pickTierByWeight(availableTiers, random);
    let tierCandidates = remaining.filter((partner) => partner.tier === selectedTier);
    if (tierCandidates.length === 0) {
      tierCandidates = remaining;
    }

    const winner = pickEngagementWeighted(tierCandidates, random);
    if (!winner) {
      break;
    }

    const winnerIndex = remaining.findIndex(
      (partner) => partner.stakeholderUserId === winner.stakeholderUserId,
    );
    if (winnerIndex < 0) {
      break;
    }

    const [selected] = remaining.splice(winnerIndex, 1);
    picked.push({
      stakeholderUserId: selected.stakeholderUserId,
      name: selected.name,
      avatarUrl: selected.avatarUrl,
      totalEngagementAmount: selected.totalEngagementAmount,
    });
  }

  return picked;
}
