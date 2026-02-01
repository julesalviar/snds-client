import {UserType} from "./user-type.enum";

export interface User {
  type: UserType;
  name?: string;
  firstName?: string;
  lastName?: string;
  sector?: string;
  subsector?: string;
  selectedOption?: string;
  contactNumber?: string;
  address?: string;

  email: string;
  password: string;
  confirmPassword?: string;
}

/** User record as returned from the API / database for list/management views. */
export interface UserListItem {
  _id?: string;
  /** Creator of the user record; e.g. "system" for system-created users. */
  created?: string;
  userName?: string;
  name?: string;
  email: string;
  schoolId?: string;
  activeRole?: string;
  roles?: string[];
  emailVerified?: boolean;
  contactNumber?: string;
  address?: string;
  sector?: string;
  subsector?: string;
  createdAt?: string | { $date: string };
  updatedAt?: string | { $date: string };
}
