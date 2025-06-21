import {environment} from "../../environments/environment";

export const API_ENDPOINT = {
  auth: {
    login: `${environment.API_URL}/auth/login`,
    register: `${environment.API_URL}/auth/signup`,
  },
}
