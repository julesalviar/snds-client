export interface MongoDate {
  $date?: string;
}

export interface MongoId {
  $oid?: string;
}

export interface School {
  _id: string | MongoId;
  region?: string;
  division: string;
  districtOrCluster?: string;
  schoolName: string;
  schoolId?: number;
  schoolOffering?: string;
  accountablePerson?: string;
  designation?: string;
  contactNumber?: string;
  officialEmailAddress?: string;
  password?: string;
  createdAt?: string | MongoDate;
  updatedAt?: string | MongoDate;
  location?: string;
  profileDocUrl?: string;
  logoUrl?: string;
}

export type SchoolInfo = Pick<
  School,
  | '_id'
  | 'division'
  | 'districtOrCluster'
  | 'schoolName'
  | 'schoolOffering'
  | 'officialEmailAddress'
  | 'accountablePerson'
  | 'contactNumber'
  | 'designation'
  | 'profileDocUrl'
  | 'logoUrl'
>;
