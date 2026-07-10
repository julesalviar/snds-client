import {Office} from "./office.model";
import {User} from "../../registration/user.model";

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
  ppn?: number;
  budgetaryRequirement?: number;
  materialsAndSupplies?: string;
  fundSource?: string[];
  participants?: string[];
  supportNeed?: string;
  supportReceivedValue?: number;
  stakeholderUserId?: string | null;
  assignedUserId?: string | User;
  officeId?: string | Office;
  amountUtilized?: number;
  implementationStatus: string;
  venue?: string;
  timeliness?: string;
  factors?: string;
  reportUrls?: string[];
  allowedRoles?: string[];
  isDedp?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PpaPlanListResponse {
  data: PpaPlan[];
  totalItems?: number;
  total?: number;
}

export interface ClassificationSummary {
  ppaCount: number;
  completedCount: number;
  percentage: number;
}

export interface DivisionAccomplishmentRow {
  division: string;
  displayName: string;
  classifications: Record<string, ClassificationSummary>;
}
