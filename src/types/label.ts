export interface Label {
  id?: string;
  name?: string;
  value?: string;
  valueType?: string;
  workspaceId?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CardLabel {
  id?: string;
  labelId?: string;
  cardId?: string;
  name?: string;
  value?: string;
  valueType?: string;
  workspaceId?: string;
  isAssigned?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LabelAttributes {
  id: string;
  name: string;
  value?: string; // was color
  workspace_id?: string; // was user_id
  value_type: "color" | "user" | "custom_field"; // new enum field
  created_at?: Date;
  updated_at?: Date;
}
