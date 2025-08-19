export interface Branch {
  _id: string;
  code: string;
  name: string;
}

export interface Department {
  _id: string;
  branchId: string;
  code: string;
  name: string;
}

export interface Team {
  _id: string;
  departmentId: string;
  code: string;
  name: string;
}

export interface User {
  _id: string;
  role: 'user' | 'recruiter' | 'teamLead' | 'marketingManager';
  branchId?: string;
  departmentId?: string;
  teamId?: string;
}

export interface Task {
  _id: string;
  userId: string;
  description: string;
  forDate: string;
  createdAt: string;
}

export interface AuthOk {
  token: string;
  userId: string;
  role: User['role'];
  branchId?: string;
  departmentId?: string;
  teamId?: string;
}

export interface ListsData {
  branches: Branch[];
  departmentsByBranch?: Record<string, Department[]>;
  teamsByDepartment?: Record<string, Team[]>;
}
