"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import {
    Card,
    Input,
    Space,
    Table,
    Tag,
    Typography,
    DatePicker,
    Spin,
} from "antd";
import dayjs from "dayjs";
import { usePlan } from "@hooks/usePlan";
import { PlanItem } from "@api/plans";

const { Title, Text } = Typography;

export default function PlannerPage() {
    const params = useParams();
    const plannerId = Number(params.plannerId);

    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState<string | undefined>(undefined);

    const { data, isLoading } = usePlan(plannerId, {
        page,
        limit,
        search: search || undefined,
        date,
    });

    const plannerName =
        data?.master_planner?.name ??
        (data as any)?.masterPlanner?.name ??
        `Planner #${plannerId}`;
    const columns = data?.columns ?? [];

    // Build table columns dynamically
    const tableColumns = columns.map((col) => {
        const key = col.key;
        return {
            title: col.header,
            dataIndex: key,
            key,
            render: (value: any, record: PlanItem) => {
                // Check dynamic values first
                if (record[col.header] !== undefined) {
                    return record[col.header];
                }
                // Then check standard fields
                if (key === "name") return <Text strong>{record.name}</Text>;
                if (key === "created_at")
                    return record.created_at
                        ? dayjs(record.created_at).format("DD MMM YYYY")
                        : "-";
                if (key === "due_date")
                    return record.due_date
                        ? dayjs(record.due_date).format("DD MMM YYYY")
                        : "-";
                if (key === "list_name") return record.list_name ?? "-";
                if (key === "product_name") return record.product_name ?? "-";
                return value ?? "-";
            },
        };
    });

    // Add capacity columns if not already in config
    const hasCapacity = columns.some((c) =>
        ["kapasitas_harian", "sisa_kapasitas", "status_produksi"].includes(c.key)
    );

    if (!hasCapacity) {
        tableColumns.push(
            {
                title: "Kapasitas",
                dataIndex: "kapasitas_harian",
                key: "kapasitas_harian",
                render: (v: number | null) => (v !== null ? v.toLocaleString() : "-"),
            },
            {
                title: "Sisa",
                dataIndex: "sisa_kapasitas",
                key: "sisa_kapasitas",
                render: (v: number | null) => (v !== null ? v.toLocaleString() : "-"),
            },
            {
                title: "Status",
                dataIndex: "status_produksi",
                key: "status_produksi",
                render: (v: "Aman" | "Overload" | null) => {
                    if (v === "Aman") return <Tag color="green">Aman</Tag>;
                    if (v === "Overload") return <Tag color="red">Overload</Tag>;
                    return "-";
                },
            }
        );
    }

    return (
        <div className="p-4">
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <Space
                    style={{
                        width: "100%",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                    }}
                >
                    <Title level={3} style={{ margin: 0 }}>
                        {plannerName}
                    </Title>
                    <Space>
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
                </Space>

                <Card>
                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: 40 }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        <Table
                            rowKey="id"
                            columns={tableColumns}
                            dataSource={data?.items ?? []}
                            pagination={{
                                current: page,
                                pageSize: limit,
                                total: data?.total ?? 0,
                                onChange: (p) => setPage(p),
                                showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} of ${total}`,
                            }}
                            scroll={{ x: "max-content" }}
                            locale={{
                                emptyText: "No items found",
                            }}
                        />
                    )}
                </Card>
            </Space>
        </div>
    );
}
