// Category Types for Frontend
export interface MainCategory {
  id: string;
  name: string;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Subcategory {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategorySubcategoryJunction {
  id: string;
  mainCategoryId: string;
  subcategoryId: string;
  calculationWeight: number;
  displayOrder: number;
  isTotalField: boolean;
  isEditableTotal: boolean;
  operator: "add" | "subtract" | "multiply" | "divide";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategorySubcategoryJunctionWithDetails
  extends CategorySubcategoryJunction {
  mainCategory?: MainCategory;
  subcategory?: Subcategory;
}

export interface MainCategoryWithSubcategories extends MainCategory {
  subcategories?: SubcategoryWithJunctionData[];
}

export interface SubcategoryWithJunctionData extends Subcategory {
  junction?: CategorySubcategoryJunction;
}

// Request/Response Types
export interface CreateMainCategoryRequest {
  name: string;
  displayOrder?: number;
}

export interface UpdateMainCategoryRequest {
  name?: string;
  displayOrder?: number;
}

export interface CreateSubcategoryRequest {
  name: string;
}

export interface UpdateSubcategoryRequest {
  name?: string;
}

export interface CreateJunctionRequest {
  mainCategoryId: string;
  subcategoryId: string;
  calculationWeight?: number;
  displayOrder?: number;
  isTotalField?: boolean;
  isEditableTotal?: boolean;
  operator?: "add" | "subtract" | "multiply" | "divide";
}

export interface BulkCreateJunctionRequest {
  mainCategoryId: string;
  subcategories: Array<{
    subcategoryId: string;
    calculationWeight?: number;
    displayOrder?: number;
    isTotalField?: boolean;
    isEditableTotal?: boolean;
    operator?: "add" | "subtract" | "multiply" | "divide";
  }>;
}

export interface UpdateJunctionRequest {
  mainCategoryId?: string;
  subcategoryId?: string;
  calculationWeight?: number;
  displayOrder?: number;
  isTotalField?: boolean;
  isEditableTotal?: boolean;
  operator?: "add" | "subtract" | "multiply" | "divide";
}

// System Overview Types
export interface CategorySystemOverview {
  totalMainCategories: number;
  totalSubcategories: number;
  totalJunctions: number;
  categoriesWithSubcategories: number;
  categoriesWithoutSubcategories: number;
  subcategoriesWithoutCategories: number;
}

// Validation Types
export interface CategoryValidationResponse {
  valid: boolean;
  message: string;
}

// Filter Types
export interface CategoryFilter {
  search?: string;
  page?: number;
  limit?: number;
}

// Reorder Types
export interface ReorderMainCategoriesRequest {
  categories: Array<{
    id: string;
    displayOrder: number;
  }>;
}

export interface ReorderSubcategoriesRequest {
  mainCategoryId: string;
  subcategories: Array<{
    junctionId: string;
    displayOrder: number;
  }>;
}