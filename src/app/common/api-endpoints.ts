import {environment} from "../../environments/environment";

export const API_ENDPOINT = {
  auth: {
    login: `${environment.API_URL}/auth/login`,
    register: `${environment.API_URL}/auth/signup`,
  },
  referenceData: `${environment.API_URL}/reference-data`,
  aip: `${environment.API_URL}/aips`,
  schoolNeed: `${environment.API_URL}/school-needs`,
}
