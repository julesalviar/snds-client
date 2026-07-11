import { getHttpErrorMessage } from './http-error-message.util';

describe('getHttpErrorMessage', () => {
  it('returns string message from nested error body', () => {
    expect(
      getHttpErrorMessage(
        { error: { message: 'Minimum engagement amount cannot be negative.' } },
        'fallback',
      ),
    ).toBe('Minimum engagement amount cannot be negative.');
  });

  it('joins array of validation messages', () => {
    expect(
      getHttpErrorMessage(
        {
          error: {
            message: [
              'minEngagementAmount must not be less than 0',
              'rotateIntervalSeconds must not be less than 3',
            ],
          },
        },
        'fallback',
      ),
    ).toBe(
      'minEngagementAmount must not be less than 0 rotateIntervalSeconds must not be less than 3',
    );
  });

  it('extracts class-validator constraint messages', () => {
    expect(
      getHttpErrorMessage(
        {
          error: {
            message: [
              {
                property: 'defaultSchoolYear',
                constraints: {
                  matches: 'defaultSchoolYear must be in YYYY-YYYY format',
                },
              },
            ],
          },
        },
        'fallback',
      ),
    ).toBe('defaultSchoolYear must be in YYYY-YYYY format');
  });

  it('returns fallback when no message is available', () => {
    expect(getHttpErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
