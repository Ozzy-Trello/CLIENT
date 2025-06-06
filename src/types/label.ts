export interface Label {
  id?: string;
  name?: string;
  value?: string;
  valueType?: string; 
  workspaceId?: string;
  createdBy?: string;
  createdAt?: string;
  checked?: boolean; //helper field for UI
}