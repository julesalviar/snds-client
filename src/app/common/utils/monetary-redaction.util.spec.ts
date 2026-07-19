import { redactSchoolNeedsMonetaryFields } from './monetary-redaction.util';
import { SchoolNeed } from '../model/school-need.model';

describe('monetary-redaction.util', () => {
  it('removes estimatedCost and engagement amounts', () => {
    const needs: SchoolNeed[] = [
      {
        estimatedCost: 12500,
        specificContribution: 'Fans',
        engagements: [{ amount: 500, note: 'ok' }],
      } as SchoolNeed,
    ];

    const redacted = redactSchoolNeedsMonetaryFields(needs);

    expect(redacted[0].estimatedCost).toBeUndefined();
    expect((redacted[0] as any).engagements[0].amount).toBeUndefined();
    expect((redacted[0] as any).engagements[0].note).toBe('ok');
    expect(needs[0].estimatedCost).toBe(12500);
  });
});
