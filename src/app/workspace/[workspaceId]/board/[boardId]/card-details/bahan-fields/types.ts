import React from "react";
import { MainCategoryWithSubcategories } from "@myTypes/category";

export interface BahanFieldsProps {
  cardId: string;
  workspaceId: string;
}

export interface POItem {
  id: string;
  cardId: string;
  poNumber: string;
  name: string; // Display name derived from poNumber
  terloading: number;
  bahanTerpakai: number | null;
  products: ProductItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductItem {
  id: string;
  name: string;
  sku?: string;
  product_code?: string;
  productId?: string;
  source?: string;
  accurateDbId?: number | string;
  poProductId?: string; // ID of the POProduct for API updates
  poProductCategoryId?: string; // Primary PO product category ID for updates
  poProductCategoryIds?: string[]; // All category IDs for this PO product
  description?: string | null;
  requestId?: number;
  sentBy?: string | null;
  orderCreated?: boolean; // Whether an order has been created for this product
  satuan?: string; // Unit field from Hikmat
  adjustment_no?: string; // Adjustment account number
  adjustment_name?: string; // Adjustment account name
  bahanTabs: BahanTab[];
  categoryData?: CategoryData[];
  warehouseProduct?: any;
}

export interface CategoryData {
  categoryId: string;
  categoryName: string;
  subcategoryValues: SubcategoryValue[];
}

export interface SubcategoryValue {
  subcategoryId: string;
  subcategoryName: string;
  value: number;
  isTotalField?: boolean; // Optional since Total fields are being removed from DB
  isEditableTotal?: boolean; // Optional since Total fields are being removed from DB
  operator?: "add" | "subtract" | "multiply" | "divide" | "sum"; // Optional since Total fields are being removed from DB
}

export interface BahanTab {
  id: string;
  name: string;
  description?: string | null;
  terloading: number;
  bahanTerpakai: number | null;
  sisaBahan: number;
  estBahan: number;
  efisiensi: number;
}

export interface POSectionProps {
  po: POItem;
  index: number;
  colors: any;
  selectedProductId: string;
  products: any[];
  isLoadingProducts: boolean;
  categories: any[];
  isLoadingCategories: boolean;
  onSelectProduct: (poId: string, productId: string) => void;
  onProductInputFocus: (poId: string) => void;
  onScanValue: (poId: string, value: string) => void;
  onOpenCameraScan?: (poId: string) => void;
  onOpenSummary: (poId: string) => void;
  onTerloadingChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number,
    resolvedProduct?: any
  ) => Promise<void>;
  onBahanTerpakaiChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number | null,
    resolvedProduct?: any,
    options?: { commit?: boolean }
  ) => void;
  onEstBahanChange: (poId: string, productId: string, bahanTabIndex: number, value: number) => void;
  onCategoryValueChange: (poId: string, productId: string, categoryId: string, subcategoryId: string, value: number) => void;
  onOrderStatusChange: (
    poId: string,
    productId: string,
    orderCreated: boolean,
    requestId?: number | null
  ) => void;
  setPOData: React.Dispatch<React.SetStateAction<POItem[]>>;
  setSelectedProductIds: React.Dispatch<React.SetStateAction<{ [poId: string]: string }>>;
  // Category update state functions
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
  isCabangFilled?: boolean;
  onLoadingStateChange?: (state: {
    poId: string;
    productId: string;
    disableLoadingButton: boolean;
    isOrderAlreadyCreated: boolean;
    handleLoadingClick: () => void;
    isLoadingAction?: boolean;
  }) => void;
  jmlCuttingValue?: number | null;
}

export interface ProductTabsProps {
  po: POItem;
  products: any[];
  colors: any;
  categories: any[];
  isLoadingCategories?: boolean;
  onTerloadingChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number,
    resolvedProduct?: any
  ) => Promise<void>;
  onBahanTerpakaiChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number | null,
    resolvedProduct?: any,
    options?: { commit?: boolean }
  ) => void;
  onEstBahanChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number
  ) => void;
  onCategoryValueChange: (
    poId: string,
    productId: string,
    categoryId: string,
    subcategoryId: string,
    value: number
  ) => void;
  onOrderStatusChange: (
    poId: string,
    productId: string,
    orderCreated: boolean,
    requestId?: number | null
  ) => void;
  deletingProductIds?: string[];
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
  isCabangFilled?: boolean;
  jmlCuttingValue?: number | null;
  onRemoveProduct: (productId: string) => void;
}



export interface BahanTabProps {
  bahanTab: BahanTab;
  po: POItem;
  product: ProductItem;
  warehouseProducts: any[];
  colors: any;
  categories: any[];
  isLoadingCategories?: boolean;
  bahanTabIndex: number;
  onTerloadingChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number,
    resolvedProduct?: any
  ) => Promise<void>;
  onBahanTerpakaiChange: (
    poId: string,
    productId: string,
    bahanTabIndex: number,
    value: number | null,
    resolvedProduct?: any,
    options?: { commit?: boolean }
  ) => void;
  onEstBahanChange: (poId: string, productId: string, bahanTabIndex: number, value: number) => void;
  onCategoryValueChange: (poId: string, productId: string, categoryId: string, subcategoryId: string, value: number) => void;
  onOrderStatusChange: (
    poId: string,
    productId: string,
    orderCreated: boolean,
    requestId?: number | null
  ) => void;
  // Category update state functions
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
  isCabangFilled?: boolean;
  onLoadingStateChange?: (state: {
    poId: string;
    productId: string;
    disableLoadingButton: boolean;
    isOrderAlreadyCreated: boolean;
    handleLoadingClick: () => void;
    isLoadingAction?: boolean;
  }) => void;
  jmlCuttingValue?: number | null;
}

export interface CategorySectionProps {
  product: ProductItem;
  po: POItem;
  colors: any;
  categories: MainCategoryWithSubcategories[];
  isLoadingCategories?: boolean;
  onCategoryValueChange: (poId: string, productId: string, categoryId: string, subcategoryId: string, value: number) => void;
  // Category update state functions
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
}

export interface BahanControlsProps {
  colors: any;
  product: ProductItem;
  bahanTab: BahanTab;
  showSyncSuccess: boolean;
  isTerloadingEditing: boolean;
  terloadingInputValue: string | null;
  onTerloadingFocus: () => void;
  onTerloadingBlur: () => void;
  onTerloadingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shouldDisableTerloadingInput: boolean;
  getEditableInputStyle: (disabled: boolean) => React.CSSProperties;
  formatNumericValue: (value?: number | null, fallback?: string) => string;
  formatDisplayValue: (value?: number | null, fallback?: string) => string;
  handleTerloadingButtonClick: () => void;
  shouldDisableInputs: boolean;
  terpakaiInputValue: string | null;
  onTerpakaiFocus: () => void;
  onTerpakaiBlur: () => void;
  onTerpakaiChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedSentBy?: string;
  requestByOptions: { value: string; label: string }[];
  onSentByChange: (value: string | undefined) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur: () => void;
  isSavingDescription: boolean;
  zeroLoadingModalOpen: boolean;
  closeZeroModal: () => void;
  handleConfirmZeroLoading: () => void;
  selectedLoadingCardId: string | null;
  setSelectedLoadingCardId: (value: string | null) => void;
  zeroLoadingCandidates: {
    id: string;
    title: string;
    description?: string;
    isCurrent?: boolean;
  }[];
  isConfirmingZeroLoading: boolean;
  jmlCuttingValue?: number | null;
}
