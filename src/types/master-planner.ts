export interface PlannerLine {
  name: string;
  capacity: number;
  halfDayCapacity?: number;
}

export interface PlannerConfig {
  holidays?: string[];
  halfDays?: string[];
  lines?: PlannerLine[];
  [key: string]: any;
}

export interface MasterPlanner {
  id: number;
  name: string;
  plannerConfig: PlannerConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterPlannerCreateRequest {
  name: string;
  plannerConfig: PlannerConfig;
}

export interface MasterPlannerUpdateRequest {
  name?: string;
  plannerConfig?: PlannerConfig;
}
