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
import { useMasterPlanners } from "@hooks/master-planner";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

const { Text } = Typography;

interface GenericPlannerInputViewProps {
    plannerName: string;
    plannerId?: number;
}

const formatDate = (val?: string | null) => {
    if (!val) return "-";
    const d = dayjs(val);
    return d.isValid() ? d.format("DD/MM/YYYY") : val;
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

const GenericPlannerInputView: React.FC<GenericPlannerInputViewProps> = ({
    plannerName,
    plannerId: propPlannerId,
}) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(100000);
    const [pageSizeChoice, setPageSizeChoice] = useState<"all" | "10" | "20" | "50" | "100">("all");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const params = useParams();
    const workspaceId = Array.isArray(params?.workspaceId) ? params.workspaceId[0] : params?.workspaceId;
    const [date, setDate] = useState<string | undefined>(undefined);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [listFilter, setListFilter] = useState<string | undefined>(undefined);
    const [productFilter, setProductFilter] = useState<string>("");
    const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
    const [dynamicDateFilters, setDynamicDateFilters] = useState<Record<string, string>>({});

    // Bulk update state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkDate, setBulkDate] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [inlineUpdatingId, setInlineUpdatingId] = useState<string | null>(null);

    const queryClient = useQueryClient();
    const refreshPlan = () => {
        if (resolvedPlannerId) {
            queryClient.invalidateQueries({ queryKey: ["plan", resolvedPlannerId] });
        }
    };

    const { data: planners = [], isLoading: loadingPlanners } = useMasterPlanners();

    const normalizedPlannerName = plannerName.toLowerCase().trim();
    const candidateNames = [normalizedPlannerName];

    const resolvedPlanner =
        propPlannerId
            ? planners.find(p => p.id === propPlannerId)
            : planners.find((p) => candidateNames.includes(p.name.toLowerCase()));

    const resolvedPlannerId = resolvedPlanner?.id;
    const plannerConfig =
        (resolvedPlanner as any)?.plannerConfig ||
        (resolvedPlanner as any)?.planner_config ||
        {};
    const includeLists: string[] = plannerConfig.include_lists || plannerConfig.includeLists || [];
    const dateField = getDateFieldName(
        plannerName,
        plannerConfig?.date_field || plannerConfig?.dateField
    );

    // Build filters payload
    const filtersPayload: PlanFilterParam[] = [];
    if (listFilter) filtersPayload.push({ field: "list_name", value: listFilter, operator: "eq" });
    if (productFilter) filtersPayload.push({ field: "product_name", value: productFilter, operator: "like" });
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
    const columns = (data?.columns ?? []).filter((col) => col.header !== dateField);
    const plannerColumns = Array.isArray(plannerConfig?.columns) ? plannerConfig.columns : [];

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
        if (isListHeader(col.header)) return false;
        if (isProductHeader(col.header)) return false;
        if (col.header === dateField) return false;
        return true;
    });

    const isLoading = loadingPlanners || loadingPlan;

    const handleRefresh = () => {
        refreshPlan();
    };

    const activeFiltersCount =
        (search ? 1 : 0) +
        (date ? 1 : 0) +
        (listFilter ? 1 : 0) +
        (productFilter ? 1 : 0) +
        Object.values(dynamicFilters).filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length +
        Object.values(dynamicDateFilters).filter((v) => v !== undefined && v !== null && String(v).trim() !== "").length;

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
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>List</span>
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
                <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Product</span>
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
        </div>
    );

    const handleUpdateDate = async (cardIds: string[], newDate: string) => {
        if (!resolvedPlannerId) return;
        try {
            if (cardIds.length > 1) setBulkUpdating(true);
            else setInlineUpdatingId(cardIds[0]);

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
                const boardId = data?.boardId;
                if (boardId && record.id && record.listId && workspaceId) {
                    const url = `/workspace/${workspaceId}/board/${boardId}?cardId=${record.id}&listId=${record.listId}`;
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
            render: (v: string) => formatDate(v),
        },
        {
            title: "Due Date",
            dataIndex: "dueDate",
            key: "dueDate",
            width: 120,
            render: (v: string) => formatDate(v),
        },
        {
            title: "List",
            dataIndex: "listName",
            key: "listName",
            width: 150,
        },
    ];

    // Dynamic Date Column (Editable)
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
                return (
                    <DatePicker
                        size="small"
                        allowClear={false}
                        format="DD/MM/YYYY"
                        disabled={inlineUpdatingId === record.id}
                        value={current ? dayjs(current) : undefined}
                        onChange={(d) => {
                            if (d) handleUpdateDate([record.id], d.format("YYYY-MM-DD"));
                        }}
                    />
                );
            },
        });
    }

    // Helper to access dynamic fields robustly (handling potential camelCase conversion)
    const getDynamicValue = (record: PlanItem, key: string) => {
        if (record[key] !== undefined) return record[key];
        // Try camelCase: "Tgl Bordir" -> "tglBordir"
        const camelKey = key.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
        if (record[camelKey] !== undefined) return record[camelKey];
        // Simple lower camel case attempt for safety
        const simpleCamel = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
        if (record[simpleCamel] !== undefined) return record[simpleCamel];
        return undefined;
    };

    const getJmlProduksiValue = (record: PlanItem) => {
        const dynamicVal = getDynamicValue(record, "Jml Produksi");
        if (dynamicVal !== undefined && dynamicVal !== null) return dynamicVal;
        if (record.jmlProduksi !== undefined && record.jmlProduksi !== null) return record.jmlProduksi;
        if ((record as any).jml_produksi !== undefined && (record as any).jml_produksi !== null) return (record as any).jml_produksi;
        return null;
    };

    // Add remaining generic columns (excluding the editable date column)
    if (data?.columns) {
        data.columns.forEach((col) => {
            if (["name", "createdAt", "dueDate", "listName", "name", "created_at", "due_date", "list_name"].includes(col.key)) return;
            if (col.header === dateField) return;

            tableColumns.push({
                title: col.header,
                dataIndex: col.key,
                key: col.key,
                width: 120,
                render: (value: any, record: PlanItem) => {
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
    }

    const hasJmlProduksiColumn = tableColumns.some(
        (col: any) =>
            (typeof col.title === "string" && col.title.toLowerCase().includes("jml produksi")) ||
            col.key === "jmlProduksi" ||
            col.dataIndex === "jmlProduksi"
    );

    if (!hasJmlProduksiColumn) {
        tableColumns.push({
            title: "Jml Produksi",
            dataIndex: "jmlProduksi",
            key: "jmlProduksi",
            width: 120,
            render: (_: any, record: PlanItem) => {
                const val = getJmlProduksiValue(record);
                const numVal = parseNumeric(val);
                return numVal !== null ? formatNumber(numVal) : "-";
            },
        });
    }

    // Capacity columns
    tableColumns.push(
        {
            title: "Kapasitas",
            dataIndex: "kapasitasHarian",
            key: "kapasitasHarian",
            width: 90,
            render: (v: number | null) => (v !== null && v !== undefined ? formatNumber(v) : "-"),
        },
        {
            title: "Sisa",
            dataIndex: "sisaKapasitas",
            key: "sisaKapasitas",
            width: 80,
            render: (v: number | null) => (v !== null && v !== undefined ? formatNumber(v) : "-"),
        },
        {
            title: "Status",
            dataIndex: "statusProduksi",
            key: "statusProduksi",
            width: 90,
            render: (v: "Aman" | "Overload" | null) => {
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

    if (!resolvedPlannerId && !loadingPlanners) {
        return (
            <div style={{ textAlign: "center", padding: 40 }}>
                <Text type="secondary">Planner &quot;{plannerName}&quot; not found</Text>
            </div>
        );
    }

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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
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
                    dataSource={data?.items ?? []}
                    size="small"
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        preserveSelectedRowKeys: true,
                    }}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: data?.total ?? 0,
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
