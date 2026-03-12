import { ActivityType } from '../enums/activity-type.enum';
import { UserListItem } from '../../registration/user.model';
import { School } from './school.model';

export interface Activity {
  _id?: string;
  title: string;
  description?: string;
  type?: ActivityType;
  active?: boolean;
  hasTime?: boolean;
  startDatetime?: string;
  endDatetime?: string;
  location?: string;
  stakeholderId?: string | UserListItem;
  schoolId?: string | School;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityListResponse {
  data: Activity[];
  totalItems?: number;
  total?: number;
}
