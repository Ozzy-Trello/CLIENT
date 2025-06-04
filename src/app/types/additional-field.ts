import { ApiResponse } from "./api";

export interface AdditionalFieldTab {
  key: string;
  label: string;
  fields: Record<
    string,
    {
      label: string;
      value: number;
    }
  >;
}

export interface AdditionalFieldItem {
  id: string;
  name: string;
  color?: string;
  variant?: string;
  pattern?: string;
  remainingAmount?: number;
  usedAmount?: number;
  estimatedProduction?: number;
  additionalFields: Record<string, Record<string, number>>;
  fields?: AdditionalFieldTab[];
  __rawInputs?: Record<string, string>;
}

export interface AdditionalFieldDTO {
  data: string;
  id: string;
  cardId: string;
  items: AdditionalFieldItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdditionalFieldDTO {
  cardId: string;
  items: AdditionalFieldItem[];
}

export interface UpdateAdditionalFieldDTO {
  items?: AdditionalFieldItem[];
}

export interface AdditionalFieldResponse
  extends ApiResponse<AdditionalFieldDTO> {}
export interface AdditionalFieldsResponse
  extends ApiResponse<AdditionalFieldDTO[]> {}
