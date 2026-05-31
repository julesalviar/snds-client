import {environment} from "../../environments/environment";

export const API_ENDPOINT = {
  auth: {
    login: `${environment.API_URL}/auth/login`,
    register: `${environment.API_URL}/auth/signup`,
    switchRole: `${environment.API_URL}/auth/switch-role`,
    assignRoles: `${environment.API_URL}/auth/users`,
  },
  referenceData: `${environment.API_URL}/reference-data`,
  internalReferenceData: `${environment.API_URL}/internal-reference-data`,
  pillarConfigs: `${environment.API_URL}/pillar-configs`,
  aip: `${environment.API_URL}/aips`,
  schoolNeed: `${environment.API_URL}/school-needs`,
  schools: `${environment.API_URL}/schools`,
  upload: `${environment.API_URL}/upload`,
  users: {
    profile: `${environment.API_URL}/users/profile`,
    changePassword: `${environment.API_URL}/users/change-password`,
    list: `${environment.API_URL}/users`,
  },
  userInvites: `${environment.API_URL}/user-invites`,
  engagements: `${environment.API_URL}/engagements`,
  mail: {
    confirmEmail: `${environment.API_URL}/mail/confirm-email`,
    confirmEmailVerify: `${environment.API_URL}/mail/confirm-email/verify`,
    resetPassword: `${environment.API_URL}/mail/reset-password`,
    resetPasswordVerify: `${environment.API_URL}/mail/reset-password/verify`,
    invite: `${environment.API_URL}/mail/invite`,
  },
  reports: `${environment.API_URL}/reports`,
  ppaPlan: `${environment.API_URL}/ppa-plan`,
  activity: `${environment.API_URL}/activity`,
  offices: `${environment.API_URL}/offices`,
  widget: {
    resourceGenerations: `${environment.API_URL}/widgets/resource-generations`,
    partners: `${environment.API_URL}/widgets/partners`,
  },
}
