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
    Modal,
} from "antd";
import dayjs from "dayjs";
import { usePlan } from "@hooks/usePlan";
import { PlanFilterParam, PlanItem, bulkUpdatePlanDate } from "@api/plans";
import { useMasterPlanners, useMasterPlannerV2 } from "@hooks/master-planner";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "@hooks/useProducts";
import { useParams } from "next/navigation";
import { Download, Filter, RotateCcw } from "lucide-react";
import {
    V2FilterGrid,
    V2FilterConfig,
    buildV2FiltersPayload,
    countActiveV2Filters,
    useV2FilterState,
} from "./shared-filters";
import { queryKeys } from "@constants/query-keys";

const { Text } = Typography;

interface GenericPlannerInputViewProps {
    plannerName: string;
    plannerId?: number;
    disabled?: boolean;
}

const formatDate = (val?: string | null) => {
    console.log(`[TGL DEBUG] formatDate input:`, val);
    if (!val) return "-";
    const d = dayjs(val);
    const result = d.isValid() ? d.format("DD/MM/YYYY") : val;
    console.log(`[TGL DEBUG] formatDate result:`, result);
    return result;
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
    };
    const key = plannerName.toLowerCase();
    return plannerConfigDate || map[key];
};

const getV2Type = (name: string): string | null => {
    const n = name.toLowerCase().trim();
    if (n.includes("sewing")) return "sewing";
    if (n.includes("cutting")) return "cutting";
    if (n.includes("bordir")) return "bordir";
    if (n.includes("knitting") || n.includes("krah")) return "knitting";
    return null;
};


const GenericPlannerInputView: React.FC<GenericPlannerInputViewProps> = ({
    plannerName,
    plannerId: propPlannerId,
    disabled = false,
}) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100000);
    const [pageSizeChoice, setPageSizeChoice] = useState<"all" | "10" | "20" | "50" | "100">("all");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [date, setDate] = useState<string | undefined>(undefined);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [listFilter, setListFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<"any" | "Aman" | "Overload">("any");
    const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
    const [dynamicDateFilters, setDynamicDateFilters] = useState<Record<string, string>>({});

    // Use shared V2 filter state hook
    const v2FilterHook = useV2FilterState();

    // Bulk update state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkDate, setBulkDate] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [inlineUpdatingId, setInlineUpdatingId] = useState<string | null>(null);

    const params = useParams();
    const workspaceId = Array.isArray(params?.workspaceId) ? params.workspaceId[0] : params?.workspaceId;

    const queryClient = useQueryClient();
    const refreshPlan = () => {
        if (resolvedPlannerId) {
            queryClient.invalidateQueries({ queryKey: ["plan", resolvedPlannerId] });
        }
        // Also invalidate V2 queries to ensure capacity and other computed fields are refreshed
        queryClient.invalidateQueries({ queryKey: queryKeys.planner.all });
    };

    const { data: planners = [], isLoading: loadingPlanners } = useMasterPlanners();
    const v2Type = getV2Type(plannerName);

    // Build V2 filters for API call using shared helper
    const v2Filters = React.useMemo(
        () => buildV2FiltersPayload(v2FilterHook.state),
        [v2FilterHook.state]
    );
    const v2OptionFilters = React.useMemo(() => {
        const state = v2FilterHook.state;
        return buildV2FiltersPayload({
            ...state,
            dueDateValues: [],
            productionDateValues: [],
        });
    }, [v2FilterHook.state]);

    const { data: v2Data, isLoading: loadingV2 } = useMasterPlannerV2(
        v2Type || "",
        v2Type ? v2Filters : undefined
    );
    const { data: v2OptionsData } = useMasterPlannerV2(
        v2Type || "",
        v2Type ? v2OptionFilters : undefined
    );
    const v2Cards = (v2Data as any)?.cards ?? [];
    const v2OptionCards = (v2OptionsData as any)?.cards ?? v2Cards;
    const v2FilterConfig = (v2Data as any)?.filterConfig as V2FilterConfig | null;
    const v2BoardId = (v2Data as any)?.board_id || (v2Data as any)?.boardId;

    // Initialize filters from API defaults and reset on planner change
    React.useEffect(() => {
        v2FilterHook.resetForPlannerChange();
    }, [v2Type]);

    React.useEffect(() => {
        if (v2Type && v2FilterConfig) {
            v2FilterHook.initializeFromDefaults(v2FilterConfig);
        }
    }, [v2Type, v2FilterConfig]);

    const normalizedPlannerName = plannerName.toLowerCase().trim();
    const candidateNames = [normalizedPlannerName];

    // Fetch products for filter dropdown
    const { data: products = [] } = useProducts();



    const resolvedPlanner =
        propPlannerId
            ? planners.find(p => p.id === propPlannerId)
            : planners.find((p) => candidateNames.includes(p.name.toLowerCase()));

    const resolvedPlannerId = resolvedPlanner?.id;
    const isV2 = !!v2Type;
    const plannerConfig = isV2
        ? (v2Data?.config ?? {})
        : ((resolvedPlanner as any)?.plannerConfig ||
            (resolvedPlanner as any)?.planner_config ||
            {});
    const effectiveColumns = (v2Data as any)?.config?.columns || plannerConfig?.columns || [];

    React.useEffect(() => {
        if (!plannerName.toLowerCase().includes("sewing")) return;
        console.log("[SEWING DEBUG] isV2:", isV2);
        console.log("[SEWING DEBUG] plannerName:", plannerName);
        console.log("[SEWING DEBUG] effectiveColumns:", effectiveColumns);
        console.log("[SEWING DEBUG] v2Data.config.columns:", (v2Data as any)?.config?.columns);
        console.log("[SEWING DEBUG] v2Cards sample:", v2Cards?.[0]);
        console.log(
            "[SEWING DEBUG] sample custom_field_values keys:",
            Object.keys(((v2Cards?.[0] as any)?.custom_field_values || (v2Cards?.[0] as any)?.customFieldValues || {}))
        );
    }, [plannerName, isV2, effectiveColumns, v2Data, v2Cards]);
    const includeLists: string[] =
        plannerConfig.include_lists ||
        plannerConfig.includeLists ||
        plannerConfig.filterLists ||
        [];
    const dateField = getDateFieldName(
        plannerName,
        plannerConfig?.date_field || plannerConfig?.dateField
    );

    // Build filters payload
    const filtersPayload: PlanFilterParam[] = [];
    if (listFilter.length > 0) filtersPayload.push({ field: "list_name", value: listFilter.join(","), operator: "like" });
    if (v2FilterHook.state.productFilter.length > 0) filtersPayload.push({ field: "product_id", value: v2FilterHook.state.productFilter.join(","), operator: "like" });
    if (date && dateField) filtersPayload.push({ field: dateField, value: date, operator: "eq" });
    Object.entries(dynamicFilters).forEach(([field, value]) => {
        if (!value) return;
        filtersPayload.push({ field, value, operator: "like" });
    });
    Object.entries(dynamicDateFilters).forEach(([field, value]) => {
        if (!value) return;
        filtersPayload.push({ field, value, operator: "eq" });
    });

    const { data, isLoading: loadingPlan } = usePlan(resolvedPlannerId, {
        page,
        limit,
        search: search || undefined,
        date,
        filters: filtersPayload,
    });
    const v1BoardId = (data as any)?.boardId || (data as any)?.board_id;
    const baseColumns = isV2
        ? (Array.isArray(effectiveColumns) ? effectiveColumns : [])
        : (data?.columns ?? []);
    const columns = (baseColumns ?? []).filter((col) => col.header !== dateField);
    const plannerColumns = Array.isArray(effectiveColumns) ? effectiveColumns : [];

    const columnMetaByHeader = new Map<string, any>();
    plannerColumns.forEach((c: any) => {
        if (c?.header) columnMetaByHeader.set(c.header, c);
    });

    const isDateHeader = (header: string) => {
        const meta = columnMetaByHeader.get(header);
        const systemField = meta?.system_field || meta?.systemField;
        const fieldName = meta?.field_name || meta?.fieldName;
        const h = header.toLowerCase();
        if (systemField && ["due_date", "created_at"].includes(systemField)) return true;
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

    const filterableColumns = columns.filter((col) => {
        if (isV2) return false; // V2 filters are enforced server-side; hide ad-hoc inputs.
        if (isListHeader(col.header)) return false;
        if (isProductHeader(col.header)) return false;
        if (col.header === dateField) return false;
        return true;
    });


    const cfHeaderById = React.useMemo(() => {
        const map = new Map<string, string>();
        (effectiveColumns || []).forEach((col: any) => {
            if (col?.id) map.set(col.id, col.header);
            if (col?.field_name && !col?.id) map.set(col.field_name, col.header);
            if (col?.name && !col?.id) map.set(col.name, col.header);
        });
        return map;
    }, [effectiveColumns]);

    const cfIdByHeader = React.useMemo(() => {
        const map = new Map<string, string>();
        (effectiveColumns || []).forEach((col: any) => {
            if (col?.header && col?.id) map.set(col.header, col.id);
        });
        return map;
    }, [effectiveColumns]);

    const labelForCf = React.useCallback(
        (cfId?: string, cfName?: string) => {
            if (cfId && cfHeaderById.has(cfId)) return cfHeaderById.get(cfId);
            if (cfName) return cfName;
            if (cfId) return cfId;
            return "Custom Field";
        },
        [cfHeaderById],
    );

    const appliedFilters = React.useMemo(() => {
        if (!isV2) return [];
        const arr: { label: string }[] = [];

        if (plannerConfig?.presentFilter) {
            const lbl = labelForCf(
                plannerConfig.presentFilter.cfId,
                plannerConfig.presentFilter.cfName,
            );
            arr.push({ label: `${lbl}: must have value` });
        }

        if (plannerConfig?.qtyMinFilter) {
            const lbl = labelForCf(
                plannerConfig.qtyMinFilter.cfId,
                plannerConfig.qtyMinFilter.cfName,
            );
            arr.push({ label: `${lbl}: ≥ ${plannerConfig.qtyMinFilter.minValue}` });
        }

        if (plannerConfig?.extraFilter) {
            const lbl = labelForCf(plannerConfig.extraFilter.cfId);
            arr.push({ label: `${lbl}: ${plannerConfig.extraFilter.values.join(", ")}` });
        }

        if (plannerConfig?.filterCfUnchecked || plannerConfig?.filterCfUncheckedName) {
            const lbl = labelForCf(
                plannerConfig.filterCfUnchecked,
                plannerConfig.filterCfUncheckedName,
            );
            arr.push({ label: `${lbl}: unchecked` });
        }

        return arr;
    }, [isV2, plannerConfig, labelForCf]);

    const isLoading = loadingPlanners || loadingPlan || (isV2 && loadingV2);

    const handleRefresh = () => {
        refreshPlan();
    };

    const activeFiltersCount = isV2
        ? (search ? 1 : 0) +
        (date ? 1 : 0) +
        (statusFilter !== "any" ? 1 : 0) +
        countActiveV2Filters(v2FilterConfig, v2FilterHook.state)
        : (search ? 1 : 0) +
        (date ? 1 : 0) +
        (listFilter.length > 0 ? 1 : 0) +
        (statusFilter !== "any" ? 1 : 0) +
        (v2FilterHook.state.productFilter.length > 0 ? 1 : 0) +
        Object.values(dynamicFilters).filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length +
        Object.values(dynamicDateFilters).filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length;

    const resetFilters = () => {
        setSearch("");
        setSearchInput("");
        setDate(undefined);
        setListFilter([]);
        setStatusFilter("any");
        setDynamicFilters({});
        setDynamicDateFilters({});
        // Reset V2 filters to API defaults
        v2FilterHook.resetToDefaults(v2FilterConfig);
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
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Search</span>
                <Input
                    placeholder="Search items..."
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
                        placeholder={`Filter ${dateField || "Date"}`}
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>List</span>
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
            {/* Product filter - only show for non-V2 (V2 has it in shared component) */}
            {!isV2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Product</span>
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
            {filterableColumns.map((col) => {
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
                                value={dynamicDateFilters[col.header] ? dayjs(dynamicDateFilters[col.header]) : null}
                                onChange={(d) => handleDateFilterChange(col.header, d ? d.format("YYYY-MM-DD") : undefined)}
                            />
                        ) : (
                            <Input
                                allowClear
                                placeholder={`Filter ${col.header}`}
                                value={dynamicFilters[col.header] || ""}
                                onChange={(e) => handleTextFilterChange(col.header, e.target.value)}
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

    const handleUpdateDate = async (cardIds: string[], newDate: string) => {
        console.log(`[TGL DEBUG] handleUpdateDate input:`, { cardIds, newDate });
        if (!resolvedPlannerId) return;
        try {
            if (cardIds.length > 1) setBulkUpdating(true);
            else setInlineUpdatingId(cardIds[0]);

            // Optimistic update for V2 Cache to prevent reset/flicker
            if (isV2 && v2Type) {
                const cardIdSet = new Set(cardIds);
                queryClient.setQueriesData(
                    { queryKey: queryKeys.planner.all },
                    (old: any) => {
                        if (!old || !old.cards) return old;
                        return {
                            ...old,
                            cards: old.cards.map((card: any) => {
                                if (cardIdSet.has(card.id)) {
                                    return {
                                        ...card,
                                        [dateField as string]: newDate,
                                        targetDate: newDate,
                                        target_date: newDate,
                                    };
                                }
                                return card;
                            }),
                        };
                    }
                );
            }

            await bulkUpdatePlanDate(resolvedPlannerId, { cardIds, date: newDate });
            message.success("Date updated");
            handleRefresh();

            if (cardIds.length > 1) {
                setBulkModalOpen(false);
                setBulkDate(null);
                setSelectedRowKeys([]);
            }
        } catch (error: any) {
            message.error(error?.response?.data?.message || "Failed to update date");
        } finally {
            setBulkUpdating(false);
            setInlineUpdatingId(null);
        }
    };

    const tableColumns: any[] = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            width: 200,
            render: (v: string, record: PlanItem) => {
                const boardId = isV2 ? v2BoardId : v1BoardId;
                const listId = (record as any)?.listId || (record as any)?.list_id || (record as any)?.listID;
                if (boardId && record.id && listId && workspaceId) {
                    const url = `/workspace/${workspaceId}/board/${boardId}?cardId=${record.id}&listId=${listId}`;
                    return (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            style={{ fontWeight: "bold" }}
                        >
                            {v}
                        </a>
                    );
                }
                return <Text strong>{v}</Text>;
            },
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 120,
            render: (_: string, record: PlanItem) => {
                const val = (record as any).createdAt ?? (record as any).created_at;
                return formatDate(val as any);
            },
        },
        {
            title: "Due Date",
            dataIndex: "dueDate",
            key: "dueDate",
            width: 120,
            render: (_: string, record: PlanItem) => {
                const val = (record as any).dueDate ?? (record as any).due_date;
                return formatDate(val as any);
            },
        },
        {
            title: "List",
            dataIndex: "listName",
            key: "listName",
            width: 150,
            render: (_: string, record: PlanItem) =>
                (record as any).listName || (record as any).list_name || "-",
        },
    ];


    // Helper to access dynamic fields robustly (handling potential camelCase conversion)
    const getDynamicValue = (record: PlanItem, key: string) => {
        const cfValues = (record as any)?.customFieldValues || (record as any)?.custom_field_values || {};
        // Prefer CF lookup by header -> id
        const cfId = cfIdByHeader.get(key);
        if (cfId && cfValues[cfId] !== undefined) return cfValues[cfId];

        if (cfValues[key] !== undefined) return cfValues[key];

        const keyLower = key.toLowerCase();
        for (const [k, v] of Object.entries(cfValues)) {
            if (k.toLowerCase() === keyLower) return v;
        }

        if (record[key] !== undefined) return record[key];
        // Try camelCase: "Tgl Bordir" -> "tglBordir"
        const camelKey = key.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
        if (cfValues[camelKey] !== undefined) return cfValues[camelKey];
        if (record[camelKey] !== undefined) return record[camelKey];
        // Simple lower camel case attempt for safety
        const simpleCamel = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
        if (cfValues[simpleCamel] !== undefined) return cfValues[simpleCamel];
        if (record[simpleCamel] !== undefined) return record[simpleCamel];
        return undefined;
    };

    const qtyLabel = React.useMemo(() => {
        if (plannerConfig?.filterLabels?.qty) return plannerConfig.filterLabels.qty;
        if (plannerConfig?.qtyId) {
            const found = (effectiveColumns || []).find((col: any) => col?.id === plannerConfig.qtyId);
            if (found?.header) return found.header;
        }
        return "Jumlah";
    }, [plannerConfig, effectiveColumns]);

    const getQtyValue = (record: PlanItem) => {
        const dynamicVal = getDynamicValue(record, qtyLabel);
        if (dynamicVal !== undefined && dynamicVal !== null) return dynamicVal;
        if (record.jmlProduksi !== undefined && record.jmlProduksi !== null) return record.jmlProduksi;
        if ((record as any).jml_produksi !== undefined && (record as any).jml_produksi !== null) return (record as any).jml_produksi;
        return null;
    };


    // Add remaining generic columns (excluding the editable date column)
    const sourceColumns = isV2
        ? (effectiveColumns || [])
        : (data?.columns || []);

    sourceColumns.forEach((col: any) => {
        const key = col.key || col.field || col.field_name || col.fieldName || col.id || col.name || col.header;
        if (!key) return;
        if (["name", "createdAt", "dueDate", "listName", "created_at", "due_date", "list_name"].includes(key)) return;
        if (col.header === dateField) return;

        // Special handling for system fields product/warna so we show the joined names
        const isProduct = key === "product_name" || key === "productName" || col.header?.toLowerCase() === "produk";
        const isWarna = key === "warna_name" || key === "warnaName" || col.header?.toLowerCase() === "warna";

        tableColumns.push({
            title: col.header,
            dataIndex: key,
            key,
            width: 140,
            render: (value: any, record: PlanItem) => {
                if (isProduct) return (record as any).productName || (record as any).product_name || "-";
                if (isWarna) return (record as any).warnaName || (record as any).warna_name || "-";

                const dynamicVal = getDynamicValue(record, col.header);
                const numVal = parseNumeric(dynamicVal ?? value);
                if (numVal !== null) return formatNumber(numVal);
                if (typeof dynamicVal === "string" && dynamicVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                    return formatDate(dynamicVal);
                }
                return dynamicVal ?? value ?? "-";
            }
        });
    });

    const hasQtyColumn = tableColumns.some(
        (col: any) =>
            (typeof col.title === "string" && col.title.toLowerCase() === qtyLabel.toLowerCase()) ||
            col.key === "jmlProduksi" ||
            col.dataIndex === "jmlProduksi"
    );

    if (!isV2 && !hasQtyColumn) {
        tableColumns.push({
            title: qtyLabel,
            dataIndex: "jmlProduksi",
            key: "jmlProduksi",
            width: 120,
            render: (_: any, record: PlanItem) => {
                const val = getQtyValue(record);
                const numVal = parseNumeric(val);
                return numVal !== null ? formatNumber(numVal) : "-";
            },
        });
    }

    // Dynamic Date Column (Editable) - Moved here to be after Qty as requested
    if (dateField) {
        tableColumns.push({
            title: dateField, // Use configured field name as header
            dataIndex: dateField,
            key: dateField,
            width: 160,
            render: (val: string | null, record: PlanItem) => {
                // Backend sends snake_case (target_date); also allow dynamic custom-field value
                const fallback =
                    getDynamicValue(record, dateField) ??
                    (record as any).targetDate ??
                    (record as any).target_date ??
                    record.targetDate ??
                    record.target_date ??
                    null;
                const current = val ?? fallback;
                console.log(`[TGL DEBUG] Render editable date column for card ${record.id}:`, {
                    header: dateField,
                    val,
                    fallback,
                    current
                });
                return (
                    <DatePicker
                        size="small"
                        allowClear={false}
                        format="DD/MM/YYYY"
                        disabled={disabled || inlineUpdatingId === record.id}
                        value={current ? dayjs(current) : undefined}
                        onChange={(d) => {
                            if (d) handleUpdateDate([record.id], d.format("YYYY-MM-DD"));
                        }}
                    />
                );
            },
        });
    }

    // Capacity columns
    tableColumns.push(
        {
            title: "Sisa Kapasitas",
            dataIndex: "sisaKapasitas",
            key: "sisaKapasitas",
            width: 120,
            render: (v: number | null, record: any) => {
                if (isV2) {
                    const sisa = record?.sisa_kapasitas ?? record?.sisaKapasitas ?? null;
                    return sisa !== null && sisa !== undefined ? formatNumber(sisa) : "-";
                }
                const sisa = v ?? (record?.kapasitasHarian !== undefined && record?.jmlProduksi !== undefined
                    ? record.kapasitasHarian - record.jmlProduksi
                    : null);
                return sisa !== null && sisa !== undefined ? formatNumber(sisa) : "-";
            },
        },
        {
            title: "Status",
            dataIndex: "statusProduksi",
            key: "statusProduksi",
            width: 90,
            render: (v: "Aman" | "Overload" | null, record: any) => {
                if (isV2) {
                    const status = record?.status_produksi ?? record?.statusProduksi ?? null;
                    if (status === "Aman") return <Tag color="green">Aman</Tag>;
                    if (status === "Overload") return <Tag color="red">Overload</Tag>;
                    return "-";
                }
                if (v === "Aman") return <Tag color="green">Aman</Tag>;
                if (v === "Overload") return <Tag color="red">Overload</Tag>;
                return "-";
            },
        },
        {
            title: "Status Dateline",
            dataIndex: "overdueDays",
            key: "overdueDays",
            width: 130,
            render: (v: number | null) => {
                if (v === null) return "-";
                if (v > 0) return <Tag color="red">Late {v} days</Tag>;
                return <Tag color="green">On Time</Tag>;
            },
        }
    );

    const filteredData = React.useMemo(() => {
        const source = isV2 ? v2Cards : (data?.items ?? []);
        if (statusFilter === "any") return source;
        return source.filter((item: any) => {
            const status = isV2
                ? (item?.status_produksi ?? item?.statusProduksi ?? null)
                : (
                    item?.statusProduksi ??
                    item?.status_produksi ??
                    item?.status ??
                    item?.status_production
                );
            if (!status) return false;
            return String(status).toLowerCase() === statusFilter.toLowerCase();
        });
    }, [isV2, v2Cards, data?.items, statusFilter]);

    if (!resolvedPlannerId && !loadingPlanners) {
        return (
            <div style={{ textAlign: "center", padding: 40 }}>
                <Text type="secondary">Planner &quot;{plannerName}&quot; not found</Text>
            </div>
        );
    }

    const capacityTotals = React.useMemo(() => {
        const lines = plannerConfig?.lines || [];
        const full = lines.reduce((sum: number, l: any) => sum + (parseNumeric(l?.capacity) || 0), 0);
        const half = lines.reduce((sum: number, l: any) => {
            const cap = parseNumeric(l?.capacity) || 0;
            const halfCap = parseNumeric(l?.half_day_capacity) ?? cap / 2;
            return sum + halfCap;
        }, 0);
        return { full, half };
    }, [plannerConfig?.lines]);

    const exportPlannerTable = () => {
        try {
            const visibleColumns = tableColumns.filter((c: any) => c?.title && c?.key !== "actions");
            const headers = visibleColumns.map((c: any) => String(c.title));

            const rows = filteredData.map((record: any) => {
                return visibleColumns.map((col: any) => {
                    const key = String(col.dataIndex || col.key || "");
                    let value: any = "";

                    if (key === "name") value = record?.name;
                    else if (key === "createdAt") value = formatDate(record?.createdAt ?? record?.created_at);
                    else if (key === "dueDate") value = formatDate(record?.dueDate ?? record?.due_date);
                    else if (key === "listName") value = record?.listName ?? record?.list_name;
                    else if (key === "statusProduksi") {
                        value = record?.statusProduksi ?? record?.status_produksi ?? "-";
                        value = ["Aman", "Overload"].includes(String(value)) ? value : "-";
                    }
                    else if (key === "overdueDays") {
                        const overdue = parseNumeric(record?.overdueDays);
                        if (overdue === null) value = "-";
                        else if (overdue > 0) value = `Late ${overdue} days`;
                        else value = "On Time";
                    }
                    else if (key === "sisaKapasitas") {
                        const num = parseNumeric(record?.sisaKapasitas ?? record?.sisa_kapasitas);
                        value = num === null ? "-" : formatNumber(num);
                    }
                    else if (dateField && key === dateField) {
                        value =
                            getDynamicValue(record, dateField) ??
                            record?.targetDate ??
                            record?.target_date ??
                            "";
                        value = value ? formatDate(value) : "";
                    } else {
                        const dynamicVal = getDynamicValue(record, String(col.title));
                        value = dynamicVal ?? record?.[key] ?? "";
                    }

                    const numeric = parseNumeric(value);
                    if (numeric !== null && key !== "name") {
                        value = formatNumber(numeric);
                    }

                    return String(value ?? "");
                });
            });

            const escapeCsv = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
            const csv = [headers, ...rows]
                .map((line) => line.map(escapeCsv).join(","))
                .join("\n");

            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `capacity-planner-${plannerName.toLowerCase().replace(/\s+/g, "-")}.csv`;
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
                            <Badge count={activeFiltersCount} style={{ backgroundColor: "#faad14" }} />
                        )}
                    </Space>
                }
                extra={
                    activeFiltersCount > 0 ? (
                        <Button
                            type="text"
                            size="small"
                            icon={<RotateCcw size={14} />}
                            onClick={resetFilters}
                            style={{
                                color: "#666",
                                fontSize: "12px",
                                height: "24px",
                                padding: "0 8px",
                            }}
                        >
                            Reset
                        </Button>
                    ) : null
                }
            >
                {filterGrid}
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8 }}>
                <Button size="small" icon={<Download size={14} />} onClick={exportPlannerTable}>
                    Export CSV
                </Button>
                <Button size="small" onClick={handleRefresh}>Refresh</Button>
            </div>
            {selectedRowKeys.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <Button type="primary" onClick={() => setBulkModalOpen(true)}>
                        Bulk Update ({selectedRowKeys.length})
                    </Button>
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, gap: 8 }}>
                <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>Page Size:</span>
                <Select
                    size="small"
                    value={pageSizeChoice}
                    style={{ width: 120 }}
                    options={[
                        { label: "All", value: "all" },
                        { label: "10", value: "10" },
                        { label: "20", value: "20" },
                        { label: "50", value: "50" },
                        { label: "100", value: "100" },
                    ]}
                    onChange={(val) => {
                        setPageSizeChoice(val);
                        const next = val === "all" ? (data?.total ?? 100000) : Number(val);
                        setLimit(next);
                        setPage(1);
                    }}
                />
            </div>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : (
            <Table
                    rowKey="id"
                    columns={tableColumns}
                    dataSource={filteredData}
                    size="small"
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        preserveSelectedRowKeys: true,
                    }}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: filteredData.length,
                        onChange: (p) => setPage(p),
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                        size: "small",
                        showSizeChanger: false,
                    }}
                    scroll={{ x: "max-content", y: 400 }}
                    locale={{
                        emptyText: "No items found",
                    }}
                />
            )}

            <Modal
                open={bulkModalOpen}
                title={`Bulk Update ${dateField}`}
                onCancel={() => setBulkModalOpen(false)}
                onOk={() => {
                    if (bulkDate) {
                        handleUpdateDate(selectedRowKeys.map(String), bulkDate);
                    }
                }}
                confirmLoading={bulkUpdating}
                okText="Update"
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Select new date:</Text>
                    <DatePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        value={bulkDate ? dayjs(bulkDate) : undefined}
                        onChange={(d) => setBulkDate(d ? d.format("YYYY-MM-DD") : null)}
                    />
                    <Text type="secondary">
                        {selectedRowKeys.length} items will be updated.
                    </Text>
                </Space>
            </Modal>
        </div>
    );
};

export default GenericPlannerInputView;
