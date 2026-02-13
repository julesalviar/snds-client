/** Must match backend PlanParticipant enum values. */
export enum PlanParticipant {
  TEACHERS = 'Teachers',
  SCHOOL_HEADS = 'School Heads',
  LEARNERS = 'Learners',
  PROGRAM_HOLDERS = 'Program Holders',
  NON_TEACHING_PERSONNEL = 'NT Personnel',
  SGC = 'SGC',
  SPTA = 'SPTA',
  DIVISION_PERSONNEL = 'Division Personnel',
  OTHERS = 'Others',
}

export const PLAN_PARTICIPANT_OPTIONS: PlanParticipant[] = Object.values(PlanParticipant);
