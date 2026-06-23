import { HttpContextToken } from '@angular/common/http';

export const AUTH_RETRY_CONTEXT = new HttpContextToken<boolean>(() => false);
