export enum ChangeRequestType {
  CHANGE_EMAIL = 'CHANGE_EMAIL',
}

export enum ChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

export interface EmailChangeSnapshot {
  email: string;
  userName: string;
}

export interface ChangeRequestSnapshot {
  before: EmailChangeSnapshot;
  after: EmailChangeSnapshot;
}

export interface ChangeRequestRequestor {
  _id: string;
  name?: string;
  userName: string;
  email: string;
  emailVerified?: boolean;
}

export interface ChangeRequest {
  _id: string;
  requestorId: string;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  snapshot: ChangeRequestSnapshot;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
  requestor?: ChangeRequestRequestor;
}

export interface ChangeRequestsResponse {
  data: ChangeRequest[];
  meta: {
    count: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface ListChangeRequestsParams {
  page?: number;
  limit?: number;
  status?: ChangeRequestStatus | '';
  type?: ChangeRequestType;
  search?: string;
}

export function getChangeRequestTypeIcon(type: ChangeRequestType): string {
  switch (type) {
    case ChangeRequestType.CHANGE_EMAIL:
      return 'alternate_email';
    default:
      return 'help_outline';
  }
}

export function getChangeRequestTypeLabel(type: ChangeRequestType): string {
  switch (type) {
    case ChangeRequestType.CHANGE_EMAIL:
      return 'Change email';
    default:
      return type;
  }
}

export function getChangeRequestStatusIcon(status: ChangeRequestStatus): string {
  switch (status) {
    case ChangeRequestStatus.PENDING:
      return 'schedule';
    case ChangeRequestStatus.APPROVED:
      return 'check_circle';
    case ChangeRequestStatus.DECLINED:
      return 'cancel';
    case ChangeRequestStatus.CANCELLED:
      return 'block';
    default:
      return 'help_outline';
  }
}

export function getChangeRequestStatusLabel(status: ChangeRequestStatus): string {
  switch (status) {
    case ChangeRequestStatus.PENDING:
      return 'Pending';
    case ChangeRequestStatus.APPROVED:
      return 'Approved';
    case ChangeRequestStatus.DECLINED:
      return 'Declined';
    case ChangeRequestStatus.CANCELLED:
      return 'Cancelled';
    default:
      return status;
  }
}
