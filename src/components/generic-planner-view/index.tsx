"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Spin,
  message,
} from "antd";
import dayjs from "dayjs";
import { usePlanSummary } from "@hooks/usePlan";
import { PlanFilterParam } from "@api/plans";
import { useMasterPlanners, useMasterPlannerV2 } from "@hooks/master-planner";
import { useProducts } from "@hooks/useProducts";
import { Download, Filter, RotateCcw } from "lucide-react";
import {
  V2FilterGrid,
  V2FilterConfig,
  buildV2FiltersPayload,
  countActiveV2Filters,
  useV2FilterState,
} from "./shared-filters";

const { Text } = Typography;

interface GenericPlannerViewProps {
  plannerName: string; // e.g. "Bordir", "Knitting (KM)"
  plannerId?: number; // Optional: pass ID directly if known
  disabled?: boolean;
}

const formatDate = (val?: string | null) => {
  if (!val) return "-";
  const d = dayjs(val);
  return d.isValid() ? d.format("DD MMM YYYY") : val;
};

const parseNumeric = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "");
    const num = Number(cleaned);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

const formatNumber = (val: any) => {
  const num = parseNumeric(val);
  if (num === null) return "-";
  const hasFraction = Math.abs(num - Math.trunc(num)) > 1e-6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
};

const getDateFieldName = (plannerName: string, plannerConfigDate?: string) => {
  const map: Record<string, string> = {
    sewing: "Tgl Sewing",
    cutting: "Tgl Cutting",
    bordir: "Tgl Bordir",
    "knitting (km)": "Tgl Knitting (KM)",
    knitting: "Tgl Knitting (KM)",
  };
  const key = plannerName.toLowerCase();
  return (
    plannerConfigDate || map[key] || map[key.replace(/\s+/g, "")] || "Tanggal"
  );
};

const GenericPlannerView: React.FC<GenericPlannerViewProps> = ({
  plannerName,
  plannerId: propPlannerId,
  disabled = false,
}) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(100000);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [date, setDate] = useState<string | undefined>(undefined);
  const [listFilter, setListFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"any" | "Aman" | "Overload">("any");
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>(
    {},
  );
  const [dynamicDateFilters, setDynamicDateFilters] = useState<
    Record<string, string>
  >({});
  // Use shared V2 filter state hook
  const v2FilterHook = useV2FilterState();

  const getV2Type = (name: string): string | null => {
    const n = name.toLowerCase().trim();
    if (n.includes("sewing")) return "sewing";
    if (n.includes("cutting")) return "cutting";
    if (n.includes("bordir")) return "bordir";
    if (n.includes("knitting") || n.includes("krah"))
      return "knitting";
    return null;
  };

  const v2Type = getV2Type(plannerName);

  // Fetch V2 Data with filters using shared helper
  const v2Filters = React.useMemo(
    () => buildV2FiltersPayload(v2FilterHook.state),
    [v2FilterHook.state]
  );
  // Fetch V2 Data for date options (exclude date filters so options don't collapse)
  const v2OptionFilters = React.useMemo(() => {
    const state = v2FilterHook.state;
    return buildV2FiltersPayload({
      ...state,
      dueDateValues: [],
      productionDateValues: [],
    });
  }, [v2FilterHook.state]);
  
  const { data: v2Data } = useMasterPlannerV2(
    v2Type || "",
    v2Type ? v2Filters : undefined,
  );
  const { data: v2OptionsData } = useMasterPlannerV2(
    v2Type || "",
    v2Type ? v2OptionFilters : undefined,
  );
  const lastV2FilterConfigRef = React.useRef<V2FilterConfig | null>(null);
  const lastV2CardsRef = React.useRef<any[]>([]);
  const nextV2FilterConfig = ((v2Data as any)?.filterConfig as V2FilterConfig | null) ?? null;
  if (nextV2FilterConfig) lastV2FilterConfigRef.current = nextV2FilterConfig;
  const v2FilterConfig = nextV2FilterConfig ?? lastV2FilterConfigRef.current;

  const nextV2Cards = ((v2Data as any)?.cards as any[]) ?? [];
  if (nextV2Cards.length > 0) lastV2CardsRef.current = nextV2Cards;
  const v2Cards = nextV2Cards.length > 0 ? nextV2Cards : lastV2CardsRef.current;

  const nextV2OptionCards = ((v2OptionsData as any)?.cards as any[]) ?? [];
  const v2OptionCards = nextV2OptionCards.length > 0 ? nextV2OptionCards : v2Cards;
  const isV2 = !!v2Type;

  // Reset filters on planner type change
  React.useEffect(() => {
    v2FilterHook.resetForPlannerChange();
  }, [v2Type]);

  // Initialize filters from API defaults
  React.useEffect(() => {
    if (isV2 && v2FilterConfig) {
      v2FilterHook.initializeFromDefaults(v2FilterConfig);
    }
  }, [isV2, v2FilterConfig]);

  // Fetch all planners to find ID by name if not provided (V1 Legacy)
  // Only needed if NOT V2
  const { data: planners = [], isLoading: loadingPlanners } =
    useMasterPlanners();

  const normalizedPlannerName = plannerName.toLowerCase().trim();
  const candidateNames = [normalizedPlannerName];

  // Fetch products for filter dropdown
  const { data: products = [] } = useProducts();

  const normalizeName = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

  const resolvedPlanner = propPlannerId
    ? planners.find((p) => p.id === propPlannerId)
    : planners.find((p) => {
      const plannerNameKey = normalizeName(p.name);
      return candidateNames.some((candidate) => {
        const candidateKey = normalizeName(candidate);
        return (
          plannerNameKey === candidateKey ||
          plannerNameKey.includes(candidateKey) ||
          candidateKey.includes(plannerNameKey)
        );
      });
    });

  const resolvedPlannerId = resolvedPlanner?.id;

  // Config Decision: V2 vs V1
  const plannerConfig = isV2
    ? (v2Data?.config ?? {})
    : ((resolvedPlanner as any)?.plannerConfig || {});

  const includeLists: string[] =
    plannerConfig.includeLists ||
    plannerConfig.filterLists ||
    [];
  const dateField = getDateFieldName(
    plannerName,
    plannerConfig?.dateField,
  );

  // Build filters payload for backend
  const filtersPayload: PlanFilterParam[] = [];
  if (listFilter.length > 0)
    filtersPayload.push({
      field: "list_name",
      value: listFilter.join(","),
      operator: "like",
    });
  if (v2FilterHook.state.productFilter.length > 0)
    filtersPayload.push({
      field: "product_id",
      value: v2FilterHook.state.productFilter.join(","),
      operator: "like",
    });
  if (date && dateField)
    filtersPayload.push({ field: dateField, value: date, operator: "eq" });
  Object.entries(dynamicFilters).forEach(([field, value]) => {
    if (!value) return;
    filtersPayload.push({ field, value, operator: "like" });
  });
  Object.entries(dynamicDateFilters).forEach(([field, value]) => {
    if (!value) return;
    filtersPayload.push({ field, value, operator: "eq" });
  });

  const {
    data: summaryData,
    isLoading: loadingPlan,
    refetch: refetchSummary,
  } = usePlanSummary(resolvedPlannerId, {
    page,
    limit,
    search: search || undefined,
    date,
    filters: filtersPayload,
  });

  const summary = (summaryData as any) ?? {};
  const summaryMasterPlanner = summary?.masterPlanner || null;

  const plannerConfigResolved = isV2
    ? (v2Data?.config ?? {})
    : (summaryMasterPlanner?.plannerConfig ||
      (resolvedPlanner as any)?.plannerConfig ||
      {});

  const isLoading = loadingPlanners || (loadingPlan && !summaryData);

  // Columns
  const rawColumns = Array.isArray(summary?.columns)
    ? summary?.columns
    : Array.isArray(plannerConfigResolved?.columns)
      ? plannerConfigResolved.columns
      : [];

  const plannerColumns = Array.isArray(plannerConfigResolved?.columns)
    ? plannerConfigResolved.columns
    : [];
  const columns = rawColumns.filter((col: any) => col.header !== dateField);
  const filterColumns = plannerColumns.length ? plannerColumns : rawColumns;

  const columnMetaByHeader = new Map<string, any>();
  plannerColumns.forEach((c: any) => {
    if (c?.header) columnMetaByHeader.set(c.header, c);
  });

  const isDateHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.systemField;
    const fieldName = meta?.fieldName;
    const h = header.toLowerCase();
    if (systemField && ["due_date", "created_at"].includes(systemField))
      return true;
    if (fieldName && fieldName.toLowerCase().includes("tgl")) return true;
    if (h.includes("tgl") || h.includes("date")) return true;
    return false;
  };

  const isListHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.systemField;
    return systemField === "list_name";
  };

  const isProductHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.systemField;
    return systemField === "product_name";
  };

  const filterableColumns = filterColumns.filter((col: any) => {
    if (isV2) return false; // V2 filters are applied server-side; UI shows badges instead.
    if (isListHeader(col.header)) return false;
    if (isProductHeader(col.header)) return false;
    if (col.header === dateField) return false;
    return true;
  });

  const displayItems = React.useMemo(() => {
    return (summary?.items ?? []).map((item: any) => ({
      date: item?.date,
      jmlProduksi: item?.jmlProduksi ?? item?.jml_produksi ?? null,
      kapasitasHarian: item?.kapasitasHarian ?? item?.kapasitas_harian ?? null,
      sisaKapasitas: item?.sisaKapasitas ?? item?.sisa_kapasitas ?? null,
      statusProduksi: item?.statusProduksi ?? item?.status_produksi ?? null,
      overdueDays: item?.overdueDays ?? item?.overdue_days ?? null,
    }));
  }, [summary]);

  const filteredDisplayItems = React.useMemo(() => {
    if (statusFilter === "any") return displayItems;
    return (displayItems || []).filter((item: any) => {
      const status = item?.statusProduksi ?? item?.status;
      return status === statusFilter;
    });
  }, [displayItems, statusFilter]);

  const qtyLabel =
    plannerConfigResolved?.filterLabels?.qty ||
    (plannerConfigResolved?.columns || []).find((col: any) => col?.id === plannerConfigResolved?.qtyId)?.header ||
    "Jumlah";

  const tableColumns = [
    {
      title: dateField || "Tanggal Produksi",
      dataIndex: "date",
      key: "date",
      width: 140,
      render: (v: any) => formatDate(v as string | null),
    },
    {
      title: qtyLabel,
      dataIndex: "jmlProduksi",
      key: "jmlProduksi",
      width: 140,
      render: (v: any) => {
        const numVal = parseNumeric(v);
        return numVal !== null ? formatNumber(numVal) : "-";
      },
    },
    {
      title: "Sisa Kapasitas",
      dataIndex: "sisaKapasitas",
      key: "sisaKapasitas",
      width: 130,
      render: (v: number | null) =>
        v !== null && v !== undefined ? formatNumber(v) : "-",
    },
    {
      title: "Status",
      dataIndex: "statusProduksi",
      key: "statusProduksi",
      width: 110,
      render: (v: "Aman" | "Overload" | null) => {
        if (v === "Aman") return <Tag color="green">Aman</Tag>;
        if (v === "Overload") return <Tag color="red">Overload</Tag>;
        return "-";
      },
    },
    {
      title: "Overdue (Hari)",
      dataIndex: "overdueDays",
      key: "overdueDays",
      width: 130,
      render: (v: number | null) => {
        if (v === null || v === undefined) return "-";
        if (v > 0) return <Tag color="red">{formatNumber(v)}</Tag>;
        return <Tag color="green">0</Tag>;
      },
    },
  ];

  if (!v2Type && !resolvedPlannerId && !loadingPlanners) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Text type="secondary">
          Planner &quot;{plannerName}&quot; not found
        </Text>
      </div>
    );
  }

  const activeFiltersCount =
    (search ? 1 : 0) +
    (date ? 1 : 0) +
    (listFilter.length > 0 ? 1 : 0) +
    (statusFilter !== "any" ? 1 : 0) +
    Object.values(dynamicFilters).filter(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    ).length +
    Object.values(dynamicDateFilters).filter(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    ).length +
    // V2 filter counts using shared helper
    (isV2 ? countActiveV2Filters(v2FilterConfig, v2FilterHook.state) : 0);

  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setDate(undefined);
    setListFilter([]);
    setStatusFilter("any");
    setDynamicFilters({});
    setDynamicDateFilters({});
    // Reset V2 filters to API defaults using shared helper
    v2FilterHook.resetToDefaults(v2FilterConfig);
    setPage(1);
  };

  const handleTextFilterChange = (key: string, val: string) => {
    setDynamicFilters((prev) => {
      const next = { ...prev, [key]: val };
      if (!val) delete next[key];
      return next;
    });
    setPage(1);
  };

  const handleDateFilterChange = (key: string, val?: string) => {
    setDynamicDateFilters((prev) => {
      const next = { ...prev, [key]: val || "" };
      if (!val) delete next[key];
      return next;
    });
    setPage(1);
  };

  const filterGrid = (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
          Search
        </span>
        <Input
          placeholder="Search cards..."
          allowClear
          value={searchInput}
          onChange={(e) => {
            const val = e.target.value;
            setSearchInput(val);
            if (!val.trim()) {
              setSearch("");
              setPage(1);
            }
          }}
          onPressEnter={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
        />
      </div>
      {!isV2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            {dateField || "Tanggal"}
          </span>
          <DatePicker
            placeholder="Filter by date"
            value={date ? dayjs(date) : null}
            onChange={(d) => {
              setDate(d ? d.format("YYYY-MM-DD") : undefined);
              setPage(1);
            }}
            allowClear
            style={{ width: "100%" }}
          />
        </div>
      )}
      {!isV2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            List
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder="Pilih List"
            value={listFilter}
            options={includeLists.map((l: string) => ({ label: l, value: l }))}
            onChange={(val) => {
              setListFilter(val || []);
              setPage(1);
            }}
            style={{ width: "100%" }}
          />
        </div>
      )}
      {/* Product filter - only for non-V2 (V2 has it in shared component) */}
      {!isV2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
            Product
          </span>
          <Select
            mode="multiple"
            allowClear
            placeholder="Filter Product"
            value={v2FilterHook.state.productFilter}
            options={products.map((p: any) => ({ label: p.name, value: p.id }))}
            onChange={(val) => {
              v2FilterHook.actions.setProductFilter(val || []);
              setPage(1);
            }}
            style={{ width: "100%" }}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            showSearch
          />
        </div>
      )}
      {!isV2 &&
        filterableColumns.map((col: any) => {
          const dateLike = isDateHeader(col.header);
          return (
            <div
              key={col.header}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                {col.header}
              </span>
              {dateLike ? (
                <DatePicker
                  allowClear
                  style={{ width: "100%" }}
                  value={
                    dynamicDateFilters[col.header]
                      ? dayjs(dynamicDateFilters[col.header])
                      : null
                  }
                  onChange={(d) =>
                    handleDateFilterChange(
                      col.header,
                      d ? d.format("YYYY-MM-DD") : undefined,
                    )
                  }
                />
              ) : (
                <Input
                  allowClear
                  placeholder={`Filter ${col.header}`}
                  value={dynamicFilters[col.header] || ""}
                  onChange={(e) =>
                    handleTextFilterChange(col.header, e.target.value)
                  }
                />
              )}
            </div>
          );
        })}
      {/* V2 Planner Filters - shared component */}
      {isV2 && (
        <V2FilterGrid
          filterConfig={v2FilterConfig}
          filterState={v2FilterHook.state}
          filterActions={v2FilterHook.actions}
          products={products}
          cards={v2OptionCards}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
          Status Produksi
        </span>
        <Select
          value={statusFilter}
          options={[
            { label: "Any", value: "any" },
            { label: "Aman", value: "Aman" },
            { label: "Overload", value: "Overload" },
          ]}
          onChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );

  // Planner capacity info
  const capacityTotals = React.useMemo(() => {
    const lines = plannerConfigResolved?.lines || [];
    const full = lines.reduce((sum: number, l: any) => sum + (parseNumeric(l?.capacity) || 0), 0);
    const half = lines.reduce((sum: number, l: any) => {
      const cap = parseNumeric(l?.capacity) || 0;
      const halfCap = parseNumeric(l?.half_day_capacity) ?? cap / 2;
      return sum + halfCap;
    }, 0);
    return { full, half };
  }, [plannerConfigResolved?.lines]);

  const exportPlannerSummary = () => {
    try {
      const visibleColumns = tableColumns.filter((c: any) => c?.title);
      const headers = visibleColumns.map((c: any) => String(c.title));
      const rows = filteredDisplayItems.map((record: any) =>
        visibleColumns.map((col: any) => {
          const key = String(col.dataIndex || col.key || "");
          let value = record?.[key];
          if (key === "date") value = formatDate(record?.date);
          if (key === "statusProduksi") {
            const st = record?.statusProduksi ?? record?.status_produksi ?? "-";
            value = ["Aman", "Overload"].includes(String(st)) ? st : "-";
          }
          if (key === "overdueDays") {
            const overdue = parseNumeric(record?.overdueDays ?? record?.overdue_days);
            if (overdue === null) value = "-";
            else if (overdue > 0) value = `Late ${overdue} days`;
            else value = "On Time";
          }

          const numeric = parseNumeric(value);
          if (numeric !== null && key !== "date") {
            value = formatNumber(numeric);
          }

          return String(value ?? "");
        })
      );

      const escapeCsv = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [headers, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capacity-planner-summary-${plannerName.toLowerCase().replace(/\s+/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success("Export table berhasil");
    } catch {
      message.error("Gagal export table");
    }
  };

  return (
    <div>
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
        }}
        title={
          <Space align="center">
            <Filter size={16} style={{ color: "#1890ff" }} />
            <span style={{ fontWeight: 600 }}>🔍 Filter Planner</span>
            {capacityTotals.full > 0 && (
              <span style={{ color: "#888", fontSize: 12 }}>
                Kapasitas: {formatNumber(capacityTotals.full)} | Half-day: {formatNumber(capacityTotals.half)}
              </span>
            )}
            {activeFiltersCount > 0 && (
              <Badge
                count={activeFiltersCount}
                style={{ backgroundColor: "#faad14" }}
              />
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              type="text"
              size="small"
              icon={<Download size={14} />}
              onClick={exportPlannerSummary}
              style={{
                color: "#666",
                fontSize: "12px",
                height: "24px",
                padding: "0 8px",
              }}
            >
              Export CSV
            </Button>
            <Button
              type="text"
              size="small"
              icon={<RotateCcw size={14} />}
              onClick={() => refetchSummary()}
              style={{
                color: "#666",
                fontSize: "12px",
                height: "24px",
                padding: "0 8px",
              }}
            >
              Refresh
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                type="text"
                size="small"
                onClick={() => {
                  resetFilters();
                  refetchSummary();
                }}
                style={{
                  color: "#666",
                  fontSize: "12px",
                  height: "24px",
                  padding: "0 8px",
                }}
              >
                Reset
              </Button>
            )}
          </Space>
        }
      >
        {filterGrid}
      </Card>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
      rowKey="date"
      columns={tableColumns}
      dataSource={filteredDisplayItems as any[]}
          size="small"
          pagination={false}
          scroll={{ x: "max-content", y: 400 }}
          locale={{
            emptyText: "No items found",
          }}
        />
      )}
    </div>
  );
};

export default GenericPlannerView;
