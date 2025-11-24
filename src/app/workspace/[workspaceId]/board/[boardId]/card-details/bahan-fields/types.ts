import { MainCategoryWithSubcategories } from "../../../../../../../types/category";

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
  bahanTerpakai: number;
  products: ProductItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductItem {
  id: string;
  name: string;
  poProductId?: string; // ID of the POProduct for API updates
  orderCreated?: boolean; // Whether an order has been created for this product
  satuan?: string; // Unit field from Hikmat
  adjustment_no?: string; // Adjustment account number
  adjustment_name?: string; // Adjustment account name
  bahanTabs: BahanTab[];
  categoryData?: CategoryData[];
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
  terloading: number;
  bahanTerpakai: number;
  sisaBahan: number;
  jmlProduksi: number;
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
  onScanProduct: (poId: string) => void;
  onSelectProduct: (poId: string, productId: string) => void;
  onOpenSummary: (poId: string) => void;
  onTerloadingChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onBahanTerpakaiChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onEstBahanChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onCategoryValueChange: (poIndex: number, productIndex: number, categoryId: string, subcategoryId: string, value: number) => void;
  onOrderStatusChange: (poIndex: number, productIndex: number, orderCreated: boolean) => void;
  setPOData: React.Dispatch<React.SetStateAction<POItem[]>>;
  setSelectedProductIds: React.Dispatch<React.SetStateAction<{ [poId: string]: string }>>;
  // Category update state functions
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
}



export interface BahanTabProps {
  bahanTab: BahanTab;
  po: POItem;
  product: ProductItem;
  colors: any;
  categories: any[];
  isLoadingCategories?: boolean;
  poIndex: number;
  productIndex: number;
  bahanTabIndex: number;
  onTerloadingChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onBahanTerpakaiChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onEstBahanChange: (poIndex: number, productIndex: number, bahanTabIndex: number, value: number) => void;
  onCategoryValueChange: (poIndex: number, productIndex: number, categoryId: string, subcategoryId: string, value: number) => void;
  onOrderStatusChange: (poIndex: number, productIndex: number, orderCreated: boolean) => void;
  // Category update state functions
  isCategoryLoading?: (poProductCategoryId: string) => boolean;
  getCategoryError?: (poProductCategoryId: string) => string | null;
  clearCategoryError?: (poProductCategoryId: string) => void;
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
