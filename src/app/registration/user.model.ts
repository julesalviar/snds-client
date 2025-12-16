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
