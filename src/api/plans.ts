import { api } from ".";
import { ApiResponse } from "@myTypes/api";
import { MasterPlanner } from "@myTypes/master-planner";

export interface PlanFilterParam {
  field: string;
  value: string | number;
  operator?: "like" | "eq" | "gte" | "lte";
}

export interface SewingPlan {
  id: string;
  name: string;
  createdAt?: string;
  dueDate?: string;
  listName?: string | null;
  productName?: string | null;
  routing?: string | null;
  produksi?: string | null;
  jmlProduksi?: number | null;
  tglSewing?: string | null;
  kapasitasHarian?: number | null;
  sisaKapasitas?: number | null;
  isHoliday?: boolean;
  isHalfDay?: boolean;
  statusProduksi?: "Aman" | "Overload" | null;
  overdueDays?: number | null;
}

export interface SewingPlanList {
  items: SewingPlan[];
  total: number;
  page: number;
  limit: number;
  masterPlanner: MasterPlanner | null;
}

// Generic Plan Types
export interface PlanItem {
  id: string;
  name: string;
  createdAt?: string | null;
  dueDate?: string | null;
  listName?: string | null;
  listId?: string | null;
  productName?: string | null;
  targetDate?: string | null;
  quantity?: number | null;
  kapasitasHarian?: number | null;
  sisaKapasitas?: number | null;
  isHoliday?: boolean;
  isHalfDay?: boolean;
  statusProduksi?: "Aman" | "Overload" | null;
  overdueDays?: number | null;
  [key: string]: any;
}

export interface PlanList {
  items: PlanItem[];
  total: number;
  page: number;
  limit: number;
  masterPlanner?: any;
  master_planner?: any; // backend snake_case compatibility
  columns?: { header: string; key: string }[];
  boardId?: string;
  board_id?: string; // backend snake_case compatibility
}

export const getPlan = async (
  plannerId: number,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    date?: string;
    include_lists?: string[];
    filters?: PlanFilterParam[];
  }
): Promise<ApiResponse<PlanList>> => {
  const { data } = await api.get(`/plans/${plannerId}`, {
    params: {
      ...params,
      filters:
        params?.filters && params.filters.length
          ? JSON.stringify(
            params.filters
              .filter((f) => f && f.field && f.value !== undefined && f.value !== null && String(f.value) !== "")
          )
          : undefined,
    },
  });
  return data;
};

export const bulkUpdatePlanDate = async (
  plannerId: number,
  payload: { cardIds: string[]; date: string }
): Promise<ApiResponse<null>> => {
  const { data } = await api.post(`/plans/${plannerId}/bulk-date`, {
    card_ids: payload.cardIds,
    date: payload.date,
  });
  return data;
};

export const getSewingPlans = async (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    date?: string;
    exclude_lists?: string[];
    exclude_list_name_like?: string;
    include_lists?: string[];
    filters?: PlanFilterParam[];
  }
): Promise<ApiResponse<SewingPlanList>> => {
  const { data } = await api.get("/plans/sewing", {
    params: {
      ...params,
      filters:
        params?.filters && params.filters.length
          ? JSON.stringify(
            params.filters
              .filter((f) => f && f.field && f.value !== undefined && f.value !== null && String(f.value) !== "")
          )
          : undefined,
    },
  });
  return data;
};

export const bulkUpdateTglSewing = async (payload: {
  cardIds: string[];
  date: string;
}): Promise<ApiResponse<null>> => {
  const { data } = await api.post("/plans/sewing/bulk-tgl", {
    card_ids: payload.cardIds,
    date: payload.date,
  });
  return data;
};

export const getSewingPlanner = async (): Promise<
  ApiResponse<SewingPlan[]>
> => {
  const { data } = await api.get("/plans/sewing/planner");
  return data;
};
