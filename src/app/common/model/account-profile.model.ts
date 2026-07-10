export interface AccountProfile {
  userName: string;
  email: string;
  roles: string[];
  activeRole: string;
  emailVerified?: boolean;
  emailVerificationPurpose?: 'signup' | 'email_change';
  name?: string;
  address?: string;
  contactNumber?: string;
  sector?: string;
  subsector?: string;
  avatarUrl?: string;
}

export interface UpdateMyProfilePayload {
  name?: string;
  address?: string;
  contactNumber?: string;
  sector?: string;
  subsector?: string;
  avatarUrl?: string | null;
}
