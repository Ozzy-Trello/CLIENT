"use client";

import React, { useState } from "react";
import {
    Button,
    DatePicker,
    Input,
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
import { PlanItem, bulkUpdatePlanDate } from "@api/plans";
import { useMasterPlanners } from "@hooks/master-planner";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";

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
    const [limit] = useState(50);
    const [search, setSearch] = useState("");
    const params = useParams();
    const workspaceId = Array.isArray(params?.workspaceId) ? params.workspaceId[0] : params?.workspaceId;
    const [date, setDate] = useState<string | undefined>(undefined);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    // Bulk update state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkDate, setBulkDate] = useState<string | null>(null);
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [inlineUpdatingId, setInlineUpdatingId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: planners = [], isLoading: loadingPlanners } = useMasterPlanners();

    const resolvedPlanner =
        propPlannerId
            ? planners.find(p => p.id === propPlannerId)
            : planners.find((p) => p.name.toLowerCase() === plannerName.toLowerCase());

    const resolvedPlannerId = resolvedPlanner?.id;
    const dateField = getDateFieldName(
        plannerName,
        (resolvedPlanner as any)?.plannerConfig?.date_field || (resolvedPlanner as any)?.planner_config?.date_field
    );

    const { data, isLoading: loadingPlan } = usePlan(resolvedPlannerId, {
        page,
        limit,
        search: search || undefined,
        date,
    });

    const isLoading = loadingPlanners || loadingPlan;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ["plan", resolvedPlannerId] });
    };

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

    // Capacity columns
    tableColumns.push(
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            width: 80,
            render: (v: number | null) => (v !== null && v !== undefined ? formatNumber(v) : "-"),
        },
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
        },
        {
            title: "Evaluasi Jadwal",
            key: "evaluasi_jadwal",
            width: 200,
            render: (_: any, record: PlanItem) => {
                const prodStatus = record.statusProduksi;
                const isOverdue = (record.overdueDays ?? 0) > 0;

                if (prodStatus === "Overload" && isOverdue)
                    return <Tag color="red">Segera Reschedule</Tag>;
                if (prodStatus === "Overload" && !isOverdue)
                    return <Tag color="gold">Padat, Potensi Terlambat</Tag>;
                if (prodStatus === "Aman" && !isOverdue)
                    return <Tag color="green">Sesuai</Tag>;
                if (prodStatus === "Aman" && isOverdue)
                    return <Tag color="red">Late but Aman?</Tag>; // Rare case: Capacity ok but late.

                return "-";
            }
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
            <Space style={{ marginBottom: 16 }} wrap>
                <Input.Search
                    placeholder="Search items..."
                    allowClear
                    onSearch={(val) => {
                        setSearch(val);
                        setPage(1);
                    }}
                    style={{ width: 200 }}
                />
                <DatePicker
                    placeholder={`Filter ${dateField || "Date"}`}
                    onChange={(d) => {
                        setDate(d ? d.format("YYYY-MM-DD") : undefined);
                        setPage(1);
                    }}
                    allowClear
                />
                {selectedRowKeys.length > 0 && (
                    <Button type="primary" onClick={() => setBulkModalOpen(true)}>
                        Bulk Update ({selectedRowKeys.length})
                    </Button>
                )}
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
