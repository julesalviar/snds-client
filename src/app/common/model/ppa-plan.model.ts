export interface PpaPlan {
  _id?: string;
  kra: string;
  title: string;
  activity: string;
  objective: string;
  classification: string;
  expectedOutput: string;
  implementationStartDate?: string;
  implementationEndDate?: string;
  budgetaryRequirement?: number;
  materialsAndSupplies?: string;
  fundSource?: string;
  participants?: string[];
  supportNeed?: string;
  supportReceivedValue?: number;
  stakeholderUserId: string;
  assignedUserId?: string;
  officeId?: string;
  amountUtilized?: number;
  implementationStatus: string;
  timeliness?: string;
  factors?: string;
  reportUrls?: string[];
  allowedRoles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PpaPlanListResponse {
  data: PpaPlan[];
  totalItems?: number;
  total?: number;
}
