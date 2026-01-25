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
} from "antd";
import dayjs from "dayjs";
import { usePlanSummary } from "@hooks/usePlan";
import { PlanFilterParam, PlanItem } from "@api/plans";
import { useMasterPlanners, useMasterPlannerV2 } from "@hooks/master-planner";
import { Filter, RotateCcw } from "lucide-react";

const { Text } = Typography;

interface GenericPlannerViewProps {
  plannerName: string; // e.g. "Bordir", "Knitting (KM)"
  plannerId?: number; // Optional: pass ID directly if known
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
}) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(100000);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [date, setDate] = useState<string | undefined>(undefined);
  const [listFilter, setListFilter] = useState<string | undefined>(undefined);
  const [productFilter, setProductFilter] = useState<string>("");
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>(
    {},
  );
  const [dynamicDateFilters, setDynamicDateFilters] = useState<
    Record<string, string>
  >({});

  const getV2Type = (name: string): string | null => {
    const n = name.toLowerCase().trim();
    if (n === "sewing") return "sewing";
    if (n === "cutting") return "cutting";
    if (n === "bordir") return "bordir";
    if (n === "knitting (km)" || n === "knitting" || n.includes("krah"))
      return "knitting";
    return null;
  };

  const v2Type = getV2Type(plannerName);

  // Fetch V2 Data
  const { data: v2Data, isLoading: loadingV2 } = useMasterPlannerV2(
    v2Type || "",
  );

  // Fetch all planners to find ID by name if not provided (V1 Legacy)
  // Only needed if NOT V2
  const { data: planners = [], isLoading: loadingPlanners } =
    useMasterPlanners();

  const normalizedPlannerName = plannerName.toLowerCase().trim();
  const candidateNames = [normalizedPlannerName];

  const resolvedPlanner = propPlannerId
    ? planners.find((p) => p.id === propPlannerId)
    : planners.find((p) => candidateNames.includes(p.name.toLowerCase()));

  const resolvedPlannerId = resolvedPlanner?.id;

  // Config Decision: V2 vs V1
  const plannerConfig =
    (resolvedPlanner as any)?.plannerConfig ||
    (resolvedPlanner as any)?.planner_config ||
    (v2Data?.config ?? {});

  const includeLists: string[] =
    plannerConfig.include_lists || plannerConfig.includeLists || [];
  const dateField = getDateFieldName(
    plannerName,
    plannerConfig?.date_field || plannerConfig?.dateField,
  );

  // Build filters payload for backend
  const filtersPayload: PlanFilterParam[] = [];
  if (listFilter)
    filtersPayload.push({
      field: "list_name",
      value: listFilter,
      operator: "eq",
    });
  if (productFilter)
    filtersPayload.push({
      field: "product_name",
      value: productFilter,
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

  const isLoading = v2Type ? loadingV2 : loadingPlanners || loadingPlan;

  // Columns
  const rawColumns = Array.isArray(summaryData?.columns)
    ? summaryData?.columns
    : Array.isArray(plannerConfig?.columns)
      ? plannerConfig.columns
      : [];

  const plannerColumns = Array.isArray(plannerConfig?.columns)
    ? plannerConfig.columns
    : [];
  const columns = rawColumns.filter((col: any) => col.header !== dateField);
  const filterColumns = plannerColumns.length ? plannerColumns : rawColumns;

  // Data Items Logic (already aggregated by backend summary API)
  const items: any[] = (summaryData as any)?.items ?? [];

  const columnMetaByHeader = new Map<string, any>();
  plannerColumns.forEach((c: any) => {
    if (c?.header) columnMetaByHeader.set(c.header, c);
  });

  const isDateHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.system_field || meta?.systemField;
    const fieldName = meta?.field_name || meta?.fieldName;
    const h = header.toLowerCase();
    if (systemField && ["due_date", "created_at"].includes(systemField))
      return true;
    if (fieldName && fieldName.toLowerCase().includes("tgl")) return true;
    if (h.includes("tgl") || h.includes("date")) return true;
    return false;
  };

  const isListHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.system_field || meta?.systemField;
    return systemField === "list_name";
  };

  const isProductHeader = (header: string) => {
    const meta = columnMetaByHeader.get(header);
    const systemField = meta?.system_field || meta?.systemField;
    return systemField === "product_name";
  };

  const filterableColumns = filterColumns.filter((col: any) => {
    if (isListHeader(col.header)) return false;
    if (isProductHeader(col.header)) return false;
    if (col.header === dateField) return false;
    return true;
  });

  // Helper to access dynamic fields robustly
  const getDynamicValue = (record: PlanItem, key: string) => {
    if (record[key] !== undefined) return record[key];
    const camelKey = key
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, idx) =>
        idx === 0 ? word.toLowerCase() : word.toUpperCase(),
      )
      .replace(/\s+/g, "");
    if (record[camelKey] !== undefined) return record[camelKey];
    const simpleCamel =
      key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, "");
    if (record[simpleCamel] !== undefined) return record[simpleCamel];
    return undefined;
  };

  const normalizeDateKey = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const parsedStrict = dayjs(
        trimmed,
        ["DD/MM/YYYY", "YYYY/MM/DD", "YYYY-MM-DD"],
        true,
      );
      if (parsedStrict.isValid()) return parsedStrict.format("YYYY-MM-DD");
    }
    const d = dayjs(val);
    if (!d.isValid()) return null;
    return d.format("YYYY-MM-DD");
  };

  const capacityForDate = (() => {
    const holidays = new Set(
      (plannerConfig?.holidays || [])
        .map((d: any) => normalizeDateKey(d))
        .filter((d: string | null): d is string => !!d),
    );
    const halfDays = new Set(
      (plannerConfig?.half_days || plannerConfig?.halfDays || [])
        .map((d: any) => normalizeDateKey(d))
        .filter((d: string | null): d is string => !!d),
    );
    const lines = plannerConfig?.lines || [];
    const fullCapacity = lines.reduce((sum: number, line: any) => {
      const cap = parseNumeric(line?.capacity) || 0;
      return sum + cap;
    }, 0);
    const halfCapacity = lines.reduce((sum: number, line: any) => {
      const cap = parseNumeric(line?.capacity) || 0;
      const halfCap = parseNumeric((line as any)?.half_day_capacity) ?? cap / 2;
      return sum + halfCap;
    }, 0);

    return (dateKey: string | null): number | null => {
      if (!dateKey) return null;
      if (holidays.has(dateKey)) return 0;
      if (halfDays.has(dateKey)) return halfCapacity;
      return fullCapacity;
    };
  })();

  const displayItems = React.useMemo(() => {
    if (!v2Type) return items as any[];

    const grouped = new Map<
      string,
      { totalJml: number; capacity: number | null }
    >();
    items.forEach((item: any) => {
      const dateKey = normalizeDateKey(
        (item as any).date ??
          (dateField
            ? (item[dateField] ??
              (item as any).targetDate ??
              (item as any).target_date)
            : ((item as any).targetDate ?? (item as any).target_date)),
      );
      if (!dateKey) return;
      const jml =
        parseNumeric(getDynamicValue(item as any, "Jml Cutting")) ??
        parseNumeric((item as any).jmlProduksi) ??
        parseNumeric((item as any).jml_produksi) ??
        parseNumeric((item as any).quantity) ??
        parseNumeric((item as any).jml_produksi) ?? // backend summary shape
        parseNumeric((item as any).jmlProduksi) ??
        0;
      const capacity =
        (item as any).kapasitasHarian ??
        (item as any).kapasitas_harian ??
        capacityForDate(dateKey);
      const current = grouped.get(dateKey) ?? { totalJml: 0, capacity };
      current.totalJml += jml || 0;
      if (current.capacity === null && capacity !== null)
        current.capacity = capacity;
      grouped.set(dateKey, current);
    });

    return Array.from(grouped.entries())
      .map(([dateKey, info]) => {
        const capacity = info.capacity ?? capacityForDate(dateKey);
        const sisa = capacity !== null ? capacity - info.totalJml : null;
        const status =
          capacity === null || sisa === null
            ? null
            : sisa > 0
              ? "Aman"
              : "Overload";
        return {
          date: dateKey,
          jml_produksi: info.totalJml || null,
          kapasitas_harian: capacity,
          sisa_kapasitas: sisa,
          status_produksi: status,
          overdue_days: null,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items, v2Type, dateField, capacityForDate]);

  const tableColumns = [
    {
      title: dateField || "Tanggal Produksi",
      dataIndex: "date",
      key: "date",
      width: 140,
      render: (v: any) => formatDate(v as string | null),
    },
    {
      title: "Jml Produksi",
      dataIndex: "jml_produksi",
      key: "jml_produksi",
      width: 140,
      render: (v: any) => {
        const numVal = parseNumeric(v);
        return numVal !== null ? formatNumber(numVal) : "-";
      },
    },
    {
      title: "Kapasitas",
      dataIndex: "kapasitas_harian",
      key: "kapasitas_harian",
      width: 120,
      render: (v: number | null) =>
        v !== null && v !== undefined ? formatNumber(v) : "-",
    },
    {
      title: "Sisa Kapasitas",
      dataIndex: "sisa_kapasitas",
      key: "sisa_kapasitas",
      width: 130,
      render: (v: number | null) =>
        v !== null && v !== undefined ? formatNumber(v) : "-",
    },
    {
      title: "Status",
      dataIndex: "status_produksi",
      key: "status_produksi",
      width: 110,
      render: (v: "Aman" | "Overload" | null) => {
        if (v === "Aman") return <Tag color="green">Aman</Tag>;
        if (v === "Overload") return <Tag color="red">Overload</Tag>;
        return "-";
      },
    },
    {
      title: "Overdue (Hari)",
      dataIndex: "overdue_days",
      key: "overdue_days",
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
    (listFilter ? 1 : 0) +
    (productFilter ? 1 : 0) +
    Object.values(dynamicFilters).filter(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    ).length +
    Object.values(dynamicDateFilters).filter(
      (v) => v !== undefined && v !== null && String(v).trim() !== "",
    ).length;

  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setDate(undefined);
    setListFilter(undefined);
    setProductFilter("");
    setDynamicFilters({});
    setDynamicDateFilters({});
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
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
          List
        </span>
        <Select
          allowClear
          placeholder="Pilih List"
          value={listFilter}
          options={includeLists.map((l: string) => ({ label: l, value: l }))}
          onChange={(val) => {
            setListFilter(val || undefined);
            setPage(1);
          }}
          style={{ width: "100%" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
          Product
        </span>
        <Input
          placeholder="Filter Product"
          allowClear
          value={productFilter}
          onChange={(e) => {
            setProductFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {filterableColumns.map((col: any) => {
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
    </div>
  );

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
          dataSource={displayItems as any[]}
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
