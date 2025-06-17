// src/types/index.ts
export interface Client {
    id: string;
    name: string;
    imageUrl: string;
    projectCount?: number;
    projects?: string[];
    createdBy?: string;
    createdAt?: string;
  }
  
  export interface User {
    id: string;
    imageUrl: string;
    fullName: string;
    role: string;
    description?: string;
    status?: string;
  }
  
  export interface Task {
    id: string;
    clientId: string;
    project: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    LeadedBy: string[];
    AssignedTo: string[];
    createdAt: string;
    CreatedBy?: string;
  }