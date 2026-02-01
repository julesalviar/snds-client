export interface UserInvite {
  _id: string;
  email: string;
  sentAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInvitesMeta {
  count: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface UserInvitesResponse {
  data: UserInvite[];
  meta: UserInvitesMeta;
}
