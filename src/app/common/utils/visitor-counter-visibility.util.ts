import { UserType } from '../../registration/user-type.enum';

export function canShowHomeVisitorCounterWidget(
  role: string | undefined,
): boolean {
  return (
    role === UserType.DivisionAdmin ||
    role === UserType.OfficeAdmin ||
    role === UserType.SystemAdmin ||
    role === UserType.StakeHolder
  );
}
