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
const createNewPO = (index: number): POData => ({
  id: `po-${Date.now()}-${index}`, // unique ID with timestamp
  butuhBahan: true, // Default to true for new POs
  detailProduk: {}, // Initialize as empty, will be populated if butuhBahan is false
  bahan: [], // Initialize bahan as an empty array
  categories: [], // Initialize categories as an empty array
});

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
    // Initial state
    qty: 1,
    data: [createNewPO(0)],

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
      set((state) => ({
        ...state,
        data: state.data.map((po) =>
          po.id === poId ? { ...po, ...updates } : po
        ),
      }));
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
        // Create a map of existing POs for efficient lookup
        const existingPOs = new Map(state.data.map((po) => [po.id, po]));

        // Iterate over the new data and merge it into the existing state
        savedData.data.forEach((newPO) => {
          if (existingPOs.has(newPO.id)) {
            // If the PO already exists, merge its properties
            const existingPO = existingPOs.get(newPO.id)!;
            existingPOs.set(newPO.id, { ...existingPO, ...newPO });
          } else {
            // If it's a new PO, add it to the map
            existingPOs.set(newPO.id, newPO);
          }
        });

        // Convert the map back to an array
        const mergedData = Array.from(existingPOs.values());

        return {
          ...state,
          qty: mergedData.length, // Update qty to reflect the merged data size
          data: mergedData,
        };
      });
    },
    reset: () => set({ qty: 0, data: [] }),
  })
);
