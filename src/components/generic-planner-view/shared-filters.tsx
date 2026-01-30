"use client";

import React from "react";
import { Select } from "antd";
import dayjs from "dayjs";

// Types for V2 filter config from API
export interface V2FilterFieldConfig {
  id?: string;
  name?: string;
  label: string;
  minValue?: number;
  options?: string[];
}

export interface V2FilterConfig {
  checkboxField: V2FilterFieldConfig | null;
  qtyField: V2FilterFieldConfig | null;
  presentField: V2FilterFieldConfig | null;
  optionField: V2FilterFieldConfig | null;
  dueDateField: V2FilterFieldConfig | null;
  productionDateField: V2FilterFieldConfig | null;
  listField: V2FilterFieldConfig | null;
  defaults: {
    checkbox?: "unchecked" | "checked" | "any";
    qty?: "gte1" | "any";
    present?: "present" | "any";
    option?: string[];
  };
}

// Filter state interface
export interface V2FilterState {
  // Base filters (hidden, applied as defaults from backend)
  checkboxFilter: "unchecked" | "checked" | "any";
  qtyFilter: "gte1" | "any";
  presentFilter: "present" | "any";
  optionFilter: string[];
  // User-visible filters
  productFilter: string[]; // multi-select product IDs
  dueDateValues: string[]; // multi-select dates + "blank"
  productionDateValues: string[]; // multi-select dates + "blank"
  listFilter: string[]; // multi-select list names
}

// Filter actions interface
export interface V2FilterActions {
  setCheckboxFilter: (val: "unchecked" | "checked" | "any") => void;
  setQtyFilter: (val: "gte1" | "any") => void;
  setPresentFilter: (val: "present" | "any") => void;
  setOptionFilter: (val: string[]) => void;
  setProductFilter: (val: string[]) => void;
  setDueDateValues: (val: string[]) => void;
  setProductionDateValues: (val: string[]) => void;
  setListFilter: (val: string[]) => void;
  setPage: (val: number) => void;
}

// Props for the shared filter grid
interface V2FilterGridProps {
  filterConfig: V2FilterConfig | null;
  filterState: V2FilterState;
  filterActions: V2FilterActions;
  products: Array<{ id: string; name: string }>;
  cards: any[];
}

// Build API payload from filter state
export const buildV2FiltersPayload = (state: V2FilterState) => {
  const payload: Record<string, any> = {};
  // Base filters - always send to maintain defaults (backend applies them)
  // These are hidden from UI but still sent to API
  if (state.checkboxFilter && state.checkboxFilter !== "any") payload.checkboxFilter = state.checkboxFilter;
  if (state.qtyFilter && state.qtyFilter !== "any") payload.qtyFilter = state.qtyFilter;
  if (state.presentFilter && state.presentFilter !== "any") payload.presentFilter = state.presentFilter;
  if (state.optionFilter && state.optionFilter.length > 0) payload.optionFilter = state.optionFilter;

  // User-visible filters
  if (state.productFilter && state.productFilter.length > 0) payload.productFilter = state.productFilter;
  if (state.dueDateValues && state.dueDateValues.length > 0) payload.dueDateValues = state.dueDateValues;
  if (state.productionDateValues && state.productionDateValues.length > 0) payload.productionDateValues = state.productionDateValues;
  if (state.listFilter && state.listFilter.length > 0) payload.listFilter = state.listFilter;
  return payload;
};

// Count active filters (only user-visible filters)
export const countActiveV2Filters = (
  _filterConfig: V2FilterConfig | null,
  state: V2FilterState
): number => {
  let count = 0;
  // Only count user-visible filters (not base filters)
  if (state.productFilter.length > 0) count++;
  if (state.dueDateValues.length > 0) count++;
  if (state.productionDateValues.length > 0) count++;
  if (state.listFilter.length > 0) count++;
  return count;
};

// Reset filter state to defaults
export const getDefaultV2FilterState = (filterConfig: V2FilterConfig | null): V2FilterState => {
  const defaults = filterConfig?.defaults || {};
  return {
    // Base filters - use config defaults (hidden from UI)
    checkboxFilter: defaults.checkbox || "any",
    qtyFilter: defaults.qty || "any",
    presentFilter: defaults.present || "any",
    optionFilter: defaults.option || [],
    // User-visible filters - default to empty selections
    productFilter: [],
    dueDateValues: [],
    productionDateValues: [],
    listFilter: [],
  };
};

// Shared V2 Filter Grid Component
// Shows only user-visible filters (base filters like checkbox, qty, present, option are hidden)
export const V2FilterGrid: React.FC<V2FilterGridProps> = ({
  filterConfig,
  filterState,
  filterActions,
  products,
  cards,
}) => {
  if (!filterConfig) return null;

  const normalizeDateKey = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const parsed = dayjs(trimmed, ["DD/MM/YYYY", "YYYY/MM/DD", "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm:ss.SSSZ"], true);
      if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
      const loose = dayjs(trimmed);
      if (loose.isValid()) return loose.format("YYYY-MM-DD");
    }
    const d = dayjs(val);
    if (!d.isValid()) return null;
    return d.format("YYYY-MM-DD");
  };

  const formatDateLabel = (val: string) => {
    const d = dayjs(val);
    return d.isValid() ? d.format("DD/MM/YYYY") : val;
  };

  const dueDateOptions = React.useMemo(() => {
    const set = new Set<string>();
    (cards || []).forEach((card: any) => {
      const dateVal = card?.due_date ?? card?.dueDate;
      const key = normalizeDateKey(dateVal);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [cards]);

  const productionDateOptions = React.useMemo(() => {
    const prodField = filterConfig.productionDateField;
    if (!prodField) return [];
    const set = new Set<string>();
    const fieldId = prodField.id;
    const fieldName = prodField.name;
    const fieldLabel = prodField.label;
    (cards || []).forEach((card: any) => {
      const cfs = card?.customFieldValues || card?.custom_field_values || {};
      const raw =
        card?.target_date ||
        card?.targetDate ||
        (fieldId && cfs[fieldId]) ||
        (fieldName && cfs[fieldName]) ||
        (fieldLabel ? cfs[fieldLabel] : undefined);
      const key = normalizeDateKey(raw);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [cards, filterConfig.productionDateField]);

  return (
    <>
      {/* Due Date Filter */}
      {filterConfig.dueDateField && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            Due Date
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder="Pilih Tanggal"
            value={filterState.dueDateValues}
            options={[
              { label: "Blank", value: "blank" },
              ...dueDateOptions.map((d) => ({ label: formatDateLabel(d), value: d })),
            ]}
            onChange={(val) => {
              filterActions.setDueDateValues(val || []);
              filterActions.setPage(1);
            }}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* Production Date Filter (Tgl Sewing/Cutting/Bordir/Knitting) */}
      {filterConfig.productionDateField && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            {filterConfig.productionDateField.label || "Tgl Produksi"}
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder="Pilih Tanggal"
            value={filterState.productionDateValues}
            options={[
              { label: "Blank", value: "blank" },
              ...productionDateOptions.map((d) => ({ label: formatDateLabel(d), value: d })),
            ]}
            onChange={(val) => {
              filterActions.setProductionDateValues(val || []);
              filterActions.setPage(1);
            }}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* Option Filter (Extra Filter: e.g., Mesin Bordir) */}
      {filterConfig.optionField && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            {filterConfig.optionField.label}
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder={`Pilih ${filterConfig.optionField.label}`}
            value={filterState.optionFilter}
            options={(filterConfig.optionField.options || []).map((opt) => ({
              label: opt,
              value: opt,
            }))}
            onChange={(val) => {
              filterActions.setOptionFilter(val || []);
              filterActions.setPage(1);
            }}
            style={{ width: "100%" }}
            showSearch
            optionFilterProp="label"
          />
        </div>
      )}

      {/* List Filter (multi-select options) */}
      {filterConfig.listField && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            List
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder="Pilih List"
            value={filterState.listFilter}
            options={(filterConfig.listField.options || []).map((opt) => ({
              label: opt,
              value: opt,
            }))}
            onChange={(val) => {
              filterActions.setListFilter(val || []);
              filterActions.setPage(1);
            }}
            style={{ width: "100%" }}
            showSearch
            optionFilterProp="label"
          />
        </div>
      )}

      {/* Product Filter (multi-select existing products) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
          Product
        </span>
        <Select
          mode="multiple"
          allowClear
          placeholder="Filter Product"
          value={filterState.productFilter}
          options={products.map((p) => ({ label: p.name, value: p.id }))}
          onChange={(val) => {
            filterActions.setProductFilter(val || []);
            filterActions.setPage(1);
          }}
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
        />
      </div>
    </>
  );
};

// Custom hook to manage V2 filter state
export const useV2FilterState = () => {
  // Base filters (hidden, applied from backend defaults)
  const [checkboxFilter, setCheckboxFilter] = React.useState<"unchecked" | "checked" | "any">("any");
  const [qtyFilter, setQtyFilter] = React.useState<"gte1" | "any">("any");
  const [presentFilter, setPresentFilter] = React.useState<"present" | "any">("any");
  const [optionFilter, setOptionFilter] = React.useState<string[]>([]);
  // User-visible filters
  const [productFilter, setProductFilter] = React.useState<string[]>([]);
  const [dueDateValues, setDueDateValues] = React.useState<string[]>([]);
  const [productionDateValues, setProductionDateValues] = React.useState<string[]>([]);
  const [listFilter, setListFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [filtersInitialized, setFiltersInitialized] = React.useState(false);

  const state: V2FilterState = {
    checkboxFilter,
    qtyFilter,
    presentFilter,
    optionFilter,
    productFilter,
    dueDateValues,
    productionDateValues,
    listFilter,
  };

  const actions: V2FilterActions = {
    setCheckboxFilter,
    setQtyFilter,
    setPresentFilter,
    setOptionFilter,
    setProductFilter,
    setDueDateValues,
    setProductionDateValues,
    setListFilter,
    setPage,
  };

  // Initialize from API defaults (only base filters)
  const initializeFromDefaults = React.useCallback((filterConfig: V2FilterConfig | null) => {
    if (filtersInitialized) return;
    const defaults = filterConfig?.defaults || {};
    // Set base filter defaults from API config
    if (defaults.checkbox) setCheckboxFilter(defaults.checkbox);
    if (defaults.qty) setQtyFilter(defaults.qty);
    if (defaults.present) setPresentFilter(defaults.present);
    if (defaults.option && defaults.option.length > 0) setOptionFilter(defaults.option);
    setFiltersInitialized(true);
  }, [filtersInitialized]);

  // Reset on planner type change
  const resetForPlannerChange = React.useCallback(() => {
    setFiltersInitialized(false);
    // Reset user-visible filters
    setDueDateValues([]);
    setProductionDateValues([]);
    setListFilter([]);
    setProductFilter([]);
  }, []);

  // Reset to defaults
  const resetToDefaults = React.useCallback((filterConfig: V2FilterConfig | null) => {
    const defaults = filterConfig?.defaults || {};
    // Reset base filters to config defaults
    setCheckboxFilter(defaults.checkbox || "any");
    setQtyFilter(defaults.qty || "any");
    setPresentFilter(defaults.present || "any");
    setOptionFilter(defaults.option || []);
    // Reset user-visible filters to empty selections
    setProductFilter([]);
    setDueDateValues([]);
    setProductionDateValues([]);
    setListFilter([]);
    setPage(1);
  }, []);

  return {
    state,
    actions,
    page,
    setPage,
    filtersInitialized,
    initializeFromDefaults,
    resetForPlannerChange,
    resetToDefaults,
  };
};
