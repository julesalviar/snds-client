export interface ParticipatingPartnerPickItem {
  stakeholderUserId: string;
  name: string;
  avatarUrl?: string;
  totalEngagementAmount: number;
}

export function getParticipatingPartnersDisplayCount(poolLength: number): number {
  if (poolLength === 0) {
    return 0;
  }
  if (poolLength < 3) {
    return poolLength;
  }
  return Math.min(5, poolLength);
}

/**
 * Weighted random sample without replacement.
 * Higher totalEngagementAmount increases selection probability per draw.
 */
export function pickWeightedParticipatingPartners(
  pool: readonly ParticipatingPartnerPickItem[],
  random: () => number = Math.random,
): ParticipatingPartnerPickItem[] {
  if (pool.length === 0) {
    return [];
  }

  const displayCount = getParticipatingPartnersDisplayCount(pool.length);
  const remaining = [...pool];
  const picked: ParticipatingPartnerPickItem[] = [];

  for (let i = 0; i < displayCount && remaining.length > 0; i++) {
    const weights = remaining.map((p) => p.totalEngagementAmount);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      break;
    }

    let r = random() * totalWeight;
    let index = 0;
    for (; index < remaining.length; index++) {
      r -= weights[index];
      if (r <= 0) {
        break;
      }
    }

    picked.push(...remaining.splice(index, 1));
  }

  return picked;
}
