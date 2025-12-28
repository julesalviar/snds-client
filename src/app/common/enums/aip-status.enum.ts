export const AIP_STATUSES = [
  'For Implementation',
  'Ongoing',
  'Completed',
  'Incomplete',
  'Unimplemented'
] as const;

export type AipStatus = typeof AIP_STATUSES[number];

