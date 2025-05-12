import {commonEnvironment} from "./environment.common";

export const environment = {
  ...commonEnvironment,
  production: false,
  API_URL: 'http://localhost:3000'
};
