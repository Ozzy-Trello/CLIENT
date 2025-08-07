export interface SizeBreakdown {
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
  XXXL: number;
  XXXXL: number;
  XXXXXL: number;
  custom?: { [key: string]: number };
}

export interface SizeBreakdownItem {
  label: string; // e.g., "xs-1", "m-3", "custom-size-2"
  size: string; // e.g., "XS", "M", "custom-size"
  uniqueId: string; // e.g., "1", "3", "2"
  isScanned: boolean;
  category: string; // e.g., "polo"
  field: string; // e.g., "tpj"
}

export interface SizesModalState {
  isOpen: boolean;
  itemIndex: number;
  tabKey: string;
  fieldKey: string;
  totalQuantity: number;
}

export interface SizeBreakdownModalState {
  isOpen: boolean;
  categoryKey: string;
  fieldKey: string;
  sizeData?: SizeBreakdown;
  bahanItem?: any; // The current bahan item being edited
}

export interface SummaryModalState {
  isOpen: boolean;
  itemIndex: number;
}

export interface QRCodeModalState {
  isOpen: boolean;
  itemIndex: number;
}

export interface ItemDetail {
  id: string;
  name: string;
  additionalFields: any;
  sizeBreakdowns?: SizeBreakdownItem[]; // New unified structure
  __rawInputs?: any;
  usedAmount?: number;
  remainingAmount?: number;
  variant?: string;
  pattern?: string;
  estimatedProduction?: number;
  butuhBahan?: boolean;
}

export interface AdditionalTab {
  key: string;
  fields: Record<string, any>;
  label: string;
}
