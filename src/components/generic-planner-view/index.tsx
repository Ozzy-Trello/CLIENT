"use client";

import React, { useState } from "react";
import {
    DatePicker,
    Input,
    Space,
    Table,
    Tag,
    Typography,
    Spin,
} from "antd";
import dayjs from "dayjs";
import { usePlan } from "@hooks/usePlan";
import { PlanItem } from "@api/plans";
import { useMasterPlanners } from "@hooks/master-planner";

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
    };
    const key = plannerName.toLowerCase();
    return plannerConfigDate || map[key];
};

const GenericPlannerView: React.FC<GenericPlannerViewProps> = ({
    plannerName,
    plannerId: propPlannerId,
}) => {
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState<string | undefined>(undefined);

    // Fetch all planners to find ID by name if not provided
    const { data: planners = [], isLoading: loadingPlanners } = useMasterPlanners();

    const resolvedPlanner =
        propPlannerId
            ? planners.find((p) => p.id === propPlannerId)
            : planners.find((p) => p.name.toLowerCase() === plannerName.toLowerCase());

    const resolvedPlannerId = resolvedPlanner?.id;
    const dateField = getDateFieldName(plannerName, (resolvedPlanner as any)?.plannerConfig?.date_field);

    // Fetch plan data
    const { data, isLoading: loadingPlan } = usePlan(resolvedPlannerId, {
        page,
        limit,
        search: search || undefined,
        date,
    });

    const isLoading = loadingPlanners || loadingPlan;
    const columns = (data?.columns ?? []).filter((col) => col.header !== dateField);

    // Helper to access dynamic fields robustly
    const getDynamicValue = (record: PlanItem, key: string) => {
        if (record[key] !== undefined) return record[key];
        const camelKey = key.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, idx) => idx === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '');
        if (record[camelKey] !== undefined) return record[camelKey];
        const simpleCamel = key.charAt(0).toLowerCase() + key.slice(1).replace(/\s+/g, '');
        if (record[simpleCamel] !== undefined) return record[simpleCamel];
        return undefined;
    };

    // Build table columns dynamically
    const tableColumns = columns.map((col) => {
        const key = col.key;
        return {
            title: col.header,
            dataIndex: key,
            key,
            width: 120,
            render: (value: any, record: PlanItem) => {
                // Check dynamic values first (using header as key)
                const dynamicVal = getDynamicValue(record, col.header);
                if (dynamicVal !== undefined && dynamicVal !== null) {
                    // Format dates
                    if (typeof dynamicVal === "string" && dynamicVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                        return formatDate(dynamicVal);
                    }
                    const numVal = parseNumeric(dynamicVal);
                    if (numVal !== null) return formatNumber(numVal);
                    return dynamicVal;
                }
                // Then check standard fields
                if (key === "name") return <Text strong>{record.name}</Text>;
                if (key === "createdAt" || key === "created_at") return formatDate(record.createdAt);
                if (key === "dueDate" || key === "due_date") return formatDate(record.dueDate);
                if (key === "listName" || key === "list_name") return record.listName ?? "-";
                if (key === "productName" || key === "product_name") return record.productName ?? "-";
                return value ?? "-";
            },
        };
    });

    // Editable date column (read-only here) using the configured/planned field name
    if (dateField) {
        tableColumns.unshift({
            title: dateField,
            dataIndex: dateField,
            key: dateField,
            width: 140,
            render: (_: any, record: PlanItem) => {
                const val =
                    getDynamicValue(record, dateField) ??
                    (record as any).targetDate ??
                    (record as any).target_date ??
                    record.targetDate ??
                    record.target_date ??
                    null;
                return formatDate(val as string | null);
            },
        });
    }

    // Add standard capacity columns
    tableColumns.push(
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            width: 80,
            render: (v: number | null) =>
                v !== null && v !== undefined ? formatNumber(v) : "-",
        },
        {
            title: "Kapasitas",
            dataIndex: "kapasitasHarian",
            key: "kapasitasHarian",
            width: 90,
            render: (v: number | null) =>
                v !== null && v !== undefined ? formatNumber(v) : "-",
        },
        {
            title: "Sisa",
            dataIndex: "sisaKapasitas",
            key: "sisaKapasitas",
            width: 80,
            render: (v: number | null) =>
                v !== null && v !== undefined ? formatNumber(v) : "-",
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
            <Space style={{ marginBottom: 16 }}>
                <Input.Search
                    placeholder="Search cards..."
                    allowClear
                    onSearch={(val) => {
                        setSearch(val);
                        setPage(1);
                    }}
                    style={{ width: 200 }}
                />
                <DatePicker
                    placeholder="Filter by date"
                    onChange={(d) => {
                        setDate(d ? d.format("YYYY-MM-DD") : undefined);
                        setPage(1);
                    }}
                    allowClear
                />
            </Space>

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
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: data?.total ?? 0,
                        onChange: (p) => setPage(p),
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                        size: "small",
                    }}
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
