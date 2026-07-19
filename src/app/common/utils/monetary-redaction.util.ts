import { SchoolNeed } from '../model/school-need.model';

/**
 * Strip monetary fields from school-need payloads for public/guest UI state.
 * Prefer using API-side redaction; this is a client defense-in-depth layer.
 */
export function redactSchoolNeedMonetaryFields<T extends SchoolNeed>(need: T): T {
  const {
    estimatedCost: _estimatedCost,
    engagements,
    ...rest
  } = need as T & {
    estimatedCost?: number;
    engagements?: Array<Record<string, unknown>>;
  };

  const next = { ...rest } as T & {
    engagements?: Array<Record<string, unknown>>;
  };

  if (Array.isArray(engagements)) {
    next.engagements = engagements.map((engagement) => {
      const { amount: _amount, ...engagementRest } = engagement;
      return engagementRest;
    });
  }

  return next;
}

export function redactSchoolNeedsMonetaryFields<T extends SchoolNeed>(
  needs: T[],
): T[] {
  return needs.map((need) => redactSchoolNeedMonetaryFields(need));
}
