import { api } from ".";
import { ApiResponse } from "@myTypes/api";
import { MasterPlanner } from "@myTypes/master-planner";

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

export const getSewingPlans = async (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    date?: string;
    exclude_lists?: string[];
    exclude_list_name_like?: string;
    include_lists?: string[];
  }
): Promise<ApiResponse<SewingPlanList>> => {
  const { data } = await api.get("/plans/sewing", { params });
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
