import { create } from "zustand";

// Define SizeBreakdownItem locally to avoid circular imports
export interface SizeBreakdownItem {
  label: string; // e.g., "xs-1", "m-3", "custom-size-2"
  size: string; // e.g., "XS", "M", "custom-size"
  uniqueId: string; // e.g., "1", "3", "2"
  isScanned: boolean;
  category: string; // e.g., "polo"
  field: string; // e.g., "tpj"
}

// Types for our data structure
export interface SizeData {
  xs?: number;
  s?: number;
  m?: number;
  l?: number;
  xl?: number;
  xxl?: number;
  xxxl?: number;
  [key: string]: number | undefined; // for custom sizes
}

export interface ProductField {
  [fieldName: string]: SizeData;
}

export interface DetailProduk {
  polo?: ProductField;
  oblong?: ProductField;
  kemeja?: ProductField;
  jaket?: ProductField;
  hoodie?: ProductField;
  [key: string]: ProductField | undefined;
}

export interface BahanItem {
  id: string;
  butuhBahan: boolean;
  name: string;
  bahanId: string;
  detailProduk: DetailProduk;
  sizeBreakdowns?: SizeBreakdownItem[];
}

export interface POData {
  id: string; // unique identifier for each PO
  butuhBahan: boolean; // This will be the main PO-level toggle
  detailProduk: DetailProduk; // This will be for the main PO if butuhBahan is false
  sizeBreakdowns?: SizeBreakdownItem[]; // This will be for the main PO if butuhBahan is false
  bahan: BahanItem[]; // Array to hold multiple bahan items
  categories: any[]; // TODO: Define a more specific type for categories
  // Add other fields as needed
}

export interface AdditionalFieldsState {
  qty: number;
  data: POData[];
}

export interface AdditionalFieldsStore extends AdditionalFieldsState {
  // Actions
  setQty: (qty: number) => void;
  updatePOData: (poId: string, updates: Partial<POData>) => void;
  addPO: () => void;
  removePO: (poId: string) => void;
  initializePOs: (qty: number) => void;
  loadData: (savedData: { qty: number; data: POData[] }) => void;
  reset: () => void;
}

// Helper function to create a new PO with default structure
const createNewPO = (index: number): POData => {
  // Define all product categories that should always be available
  const defaultCategories = [
    {
      key: "polo",
      label: "Polo",
      fields: [
        { key: "poloTpj", label: "Polo TPJ", isTotal: false },
        { key: "poloTnk", label: "Polo TNK", isTotal: false },
        { key: "poloTpd", label: "Polo TPD", isTotal: false },
        { key: "poloTotal", label: "Total Polo", isTotal: true },
      ],
    },
    {
      key: "oblong",
      label: "Oblong",
      fields: [
        { key: "oblongTpj", label: "Oblong TPJ", isTotal: false },
        { key: "oblongTnk", label: "Oblong TNK", isTotal: false },
        { key: "oblongTpd", label: "Oblong TPD", isTotal: false },
        { key: "oblongTotal", label: "Total Oblong", isTotal: true },
      ],
    },
    {
      key: "kemeja",
      label: "Kemeja",
      fields: [
        { key: "kemejaTpj", label: "Kemeja TPJ", isTotal: false },
        { key: "kemejaTpd", label: "Kemeja TPD", isTotal: false },
        { key: "kemejaTotal", label: "Total Kemeja", isTotal: true },
      ],
    },
    {
      key: "jaket",
      label: "Jaket",
      fields: [{ key: "jaket", label: "Total Jaket", isTotal: true }],
    },
    {
      key: "hoodie",
      label: "Hoodie",
      fields: [{ key: "hoodie", label: "Total Hoodie", isTotal: true }],
    },
    {
      key: "celana",
      label: "Celana",
      fields: [{ key: "celana", label: "Total Celana", isTotal: true }],
    },
    {
      key: "rompi",
      label: "Rompi",
      fields: [{ key: "rompi", label: "Total Rompi", isTotal: true }],
    },
    {
      key: "jersey",
      label: "Jersey",
      fields: [{ key: "jersey", label: "Total Jersey", isTotal: true }],
    },
    {
      key: "apron",
      label: "Apron",
      fields: [{ key: "apron", label: "Total Apron", isTotal: true }],
    },
    {
      key: "topi",
      label: "Topi",
      fields: [{ key: "topi", label: "Total Topi", isTotal: true }],
    },
  ];

  return {
    id: `po-${Date.now()}-${index}`, // unique ID with timestamp
    butuhBahan: true, // Default to true for new POs
    detailProduk: {}, // Initialize as empty, will be populated if butuhBahan is false
    sizeBreakdowns: [], // Initialize sizeBreakdowns as an empty array
    bahan: [], // Initialize bahan as an empty array
    categories: defaultCategories, // Initialize with all categories
  };
};

const createNewBahanItem = (index: number): BahanItem => ({
  id: `bahan-${Date.now()}-${index}`,
  butuhBahan: true,
  name: "", // Placeholder, will be updated on scan/selection
  bahanId: "", // Placeholder, will be updated on scan/selection
  detailProduk: {
    polo: {
      tpj: {},
      tnk: {},
      tpd: {},
    },
    oblong: {
      tpj: {},
      tnk: {},
      tpd: {},
    },
    kemeja: {
      tpj: {},
      tpd: {},
    },
    jaket: {
      total: {},
    },
    hoodie: {
      total: {},
    },
  },
});

export const useAdditionalFieldsStore = create<AdditionalFieldsStore>(
  (set, get) => ({
    // Initial state - start with empty data, will be initialized by loadData or setQty
    qty: 0,
    data: [],

    // Actions
    setQty: (qty: number) => {
      set((state) => {
        const newState = { ...state, qty };

        // Adjust data array based on new qty
        if (qty > state.data.length) {
          // Add new POs
          const newPOs = Array.from(
            { length: qty - state.data.length },
            (_, index) => createNewPO(state.data.length + index)
          );
          newState.data = [...state.data, ...newPOs];
        } else if (qty < state.data.length) {
          // Remove excess POs
          newState.data = state.data.slice(0, qty);
        }

        return newState;
      });
    },

    updatePOData: (poId: string, updates: Partial<POData>) => {
      // Debug logging for Polo TPJ related updates
      if (updates.sizeBreakdowns) {
        const poloTpjItems = updates.sizeBreakdowns.filter(
          (item) => item.category === "polo" && item.field === "poloTpj"
        );
        if (poloTpjItems.length > 0) {
          console.log("[Polo TPJ] Store updatePOData called:", {
            poId,
            poloTpjItems,
            totalSizeBreakdowns: updates.sizeBreakdowns.length,
          });
        }
      }

      set((state) => {
        const newState = {
          ...state,
          data: state.data.map((po) =>
            po.id === poId ? { ...po, ...updates } : po
          ),
        };

        // Debug logging for Polo TPJ after update
        if (updates.sizeBreakdowns) {
          const updatedPO = newState.data.find((po) => po.id === poId);
          const poloTpjItems = updatedPO?.sizeBreakdowns?.filter(
            (item) => item.category === "polo" && item.field === "poloTpj"
          );
          if (poloTpjItems && poloTpjItems.length > 0) {
            console.log("[Polo TPJ] Store state after update:", {
              poId,
              poloTpjItems,
              totalSizeBreakdowns: updatedPO?.sizeBreakdowns?.length,
            });
          }
        }

        return newState;
      });
    },

    addPO: () => {
      set((state) => {
        const newQty = state.qty + 1;
        return {
          ...state,
          qty: newQty,
          data: [...state.data, createNewPO(state.data.length)],
        };
      });
    },

    removePO: (poId: string) => {
      set((state) => {
        const newData = state.data.filter((po) => po.id !== poId);
        return {
          ...state,
          qty: newData.length,
          data: newData,
        };
      });
    },

    initializePOs: (qty: number) => {
      set({
        qty,
        data: Array.from({ length: qty }, (_, index) => createNewPO(index)),
      });
    },

    loadData: (savedData: { qty: number; data: POData[] }) => {
      set((state) => {
        // If there's saved data, use it completely (no merging)
        if (savedData.data && savedData.data.length > 0) {
          const migratedData = savedData.data.map((po) => ({
            ...po,
            sizeBreakdowns: po.sizeBreakdowns || [], // Ensure sizeBreakdowns is initialized (migration for existing data)
          }));

          return {
            ...state,
            qty: savedData.qty,
            data: migratedData,
          };
        } else {
          // If no saved data, initialize with the specified qty and create new POs
          const newData = Array.from({ length: savedData.qty }, (_, index) => createNewPO(index));
          
          return {
            ...state,
            qty: savedData.qty,
            data: newData,
          };
        }
      });
    },
    reset: () => set({ qty: 0, data: [] }),
  })
);
