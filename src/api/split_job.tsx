import { api } from ".";
import { ApiResponse } from "../types/type";

export interface SplitJobTemplate {
  id: string;
  name: string;
  workspace_id: string;
  custom_field_id: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SplitJobValue {
  id: string;
  name: string;
  split_job_template_id: string;
  card_id: string;
  custom_field_id: string;
  value: number;
  created_at?: string;
  updated_at?: string;
}

// Get split job templates for a workspace and custom field
export const getSplitJobTemplates = async (
  workspaceId: string,
  customFieldId?: string
): Promise<ApiResponse<SplitJobTemplate[]>> => {
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (customFieldId) {
    params.custom_field_id = customFieldId;
  }
  
  const { data } = await api.get("/split-job/templates", { params });
  return data;
};

// Get a specific split job template
export const getSplitJobTemplate = async (
  templateId: string
): Promise<ApiResponse<SplitJobTemplate>> => {
  const { data } = await api.get(`/split-job/templates/${templateId}`);
  return data;
};

// Create a new split job template
export const createSplitJobTemplate = async (
  template: Omit<SplitJobTemplate, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<SplitJobTemplate>> => {
  // Make sure we don't send empty strings for required fields
  const payload = {
    ...template,
    custom_field_id: template.custom_field_id || undefined
  };
  
  const { data } = await api.post("/split-job/templates", payload);
  return data;
};

// Get split job values for a template and card
export const getSplitJobValues = async (
  params: {
    split_job_template_id?: string;
    card_id?: string;
    custom_field_id?: string;
  }
): Promise<ApiResponse<SplitJobValue[]>> => {
  const { data } = await api.get("/split-job/values", { params });
  return data;
};

// Create a new split job value
export const createSplitJobValue = async (
  value: Omit<SplitJobValue, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<SplitJobValue>> => {
  const { data } = await api.post("/split-job/values", value);
  return data;
};

// Update a split job value
export const updateSplitJobValue = async (
  valueId: string,
  updates: Partial<SplitJobValue>
): Promise<ApiResponse<SplitJobValue>> => {
  const { data } = await api.put(`/split-job/values/${valueId}`, updates);
  return data;
};

// Delete a split job value
export const deleteSplitJobValue = async (
  valueId: string
): Promise<ApiResponse<void>> => {
  const { data } = await api.delete(`/split-job/values/${valueId}`);
  return data;
};

// Delete a split job template
export const deleteSplitJobTemplate = async (
  templateId: string
): Promise<ApiResponse<void>> => {
  const { data } = await api.delete(`/split-job/templates/${templateId}`);
  return data;
};

// Interface for grouped split job values by custom field
export interface GroupedSplitJobValues {
  [customFieldName: string]: SplitJobValue[];
}

// Get split job values grouped by custom field name
export const getSplitJobValuesByCustomField = async (
  cardId: string
): Promise<ApiResponse<GroupedSplitJobValues>> => {
  const params = { card_id: cardId };
  const { data } = await api.get("/split-job/values-by-custom-field", { params });
  return data;
};
