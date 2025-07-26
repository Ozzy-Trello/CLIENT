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

export interface SizesModalState {
  isOpen: boolean;
  itemIndex: number;
  tabKey: string;
  fieldKey: string;
  totalQuantity: number;
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
  __rawInputs?: any;
  usedAmount?: number;
  remainingAmount?: number;
  variant?: string;
  pattern?: string;
  estimatedProduction?: number;
}

export interface AdditionalTab {
  key: string;
  fields: Record<string, any>;
  label: string;
}
