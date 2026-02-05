import { api } from "./index";
import type { ChecklistDTO, ChecklistItem, CreateChecklistDTO, UpdateChecklistDTO } from "../types/checklist";
import type { ApiResponse } from "../types/api";

/**
 * Get all checklists for a specific card
 */
export const getChecklistsByCardId = async (cardId: string): Promise<ApiResponse<ChecklistDTO[]>> => {
  const { data } = await api.get(`/checklist/card/${cardId}`);
  return data;
};

/**
 * Get a specific checklist by ID
 */
export const getChecklistById = async (id: string): Promise<ApiResponse<ChecklistDTO>> => {
  const { data } = await api.get(`/checklist/${id}`);
  return data;
};

/**
 * Create a new checklist
 */
export const createChecklist = async (checklistData: CreateChecklistDTO): Promise<ApiResponse<ChecklistDTO>> => {
  const { data } = await api.post("/checklist", checklistData);
  return data;
};

/**
 * Update an existing checklist
 */
export const updateChecklist = async (id: string, checklistData: UpdateChecklistDTO): Promise<ApiResponse<ChecklistDTO>> => {
  const { data } = await api.put(`/checklist/${id}`, checklistData);
  return data;
};

/**
 * Delete a checklist
 */
export const deleteChecklist = async (id: string): Promise<ApiResponse<null>> => {
  const { data } = await api.delete(`/checklist/${id}`);
  return data;
};

/**
 * Move a checklist item between checklists
 */
export async function moveChecklistItemBetween(params: {
  sourceChecklistId: string;
  destinationChecklistId: string;
  sourceIndex: number;
  destinationIndex: number;
  item: ChecklistItem;
}) {
  const {
    sourceChecklistId,
    destinationChecklistId,
    sourceIndex,
    destinationIndex,
    item,
  } = params;

  const [sourceChecklist, destinationChecklist] = await Promise.all([
    getChecklistById(sourceChecklistId),
    getChecklistById(destinationChecklistId),
  ]);

  if (!sourceChecklist.data || !destinationChecklist.data) {
    throw new Error("Checklist not found");
  }

  const sourceData = [...sourceChecklist.data.data];
  sourceData.splice(sourceIndex, 1);

  const destinationData = [...destinationChecklist.data.data];
  destinationData.splice(destinationIndex, 0, item);

  await Promise.all([
    updateChecklist(sourceChecklistId, {
      title: sourceChecklist.data.title,
      data: sourceData,
    }),
    updateChecklist(destinationChecklistId, {
      title: destinationChecklist.data.title,
      data: destinationData,
    }),
  ]);

  return {
    sourceChecklist: sourceData,
    destinationChecklist: destinationData,
  };
}
