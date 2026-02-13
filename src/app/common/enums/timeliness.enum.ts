export const TIMELINESS = ['On-time', 'Delayed'] as const;
export type Timeliness = (typeof TIMELINESS)[number];
