export interface Label {
  id?: string;
  name?: string;
  value?: string;
  valueType?: string; 
  workspaceId?: string;
  createdBy?: string;
  createdAt?: string;
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
  createdAt?: string;
}