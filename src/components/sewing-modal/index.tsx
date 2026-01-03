import React, { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Input as AntInput,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useSewingPlans, useSewingPlanner } from "@hooks/useSewingPlans";
import { bulkUpdateTglSewing } from "@api/plans";
import { useSelector } from "react-redux";
import { selectCurrentWorkspace } from "@store/workspace_slice";
import { boards } from "@api/board";
import { lists as fetchLists } from "@api/list";

type Props = {
  open: boolean;
  onClose: () => void;
};

const { Text } = Typography;

const formatDate = (val?: string | null) => {
  if (!val) return "-";
  const d = dayjs(val);
  return d.isValid() ? d.format("DD/MM/YYYY") : val;
};

const SewingModal: React.FC<Props> = ({ open, onClose }) => {
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const [sewingPage, setSewingPage] = useState(1);
  const [sewingPageSize, setSewingPageSize] = useState(20);
  const [sewingSearch, setSewingSearch] = useState("");
  const [sewingSearchInput, setSewingSearchInput] = useState("");
  const [sewingDate, setSewingDate] = useState<string | undefined>(undefined);
  const [sewingListFilter, setSewingListFilter] = useState<string[]>([]);
  const [sewingSelectedRowKeys, setSewingSelectedRowKeys] = useState<
    React.Key[]
  >([]);
  const [bulkTglModalOpen, setBulkTglModalOpen] = useState(false);
  const [bulkTglDate, setBulkTglDate] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [inlineTglUpdatingId, setInlineTglUpdatingId] = useState<string | null>(
    null
  );
  const [listOptions, setListOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const { data: sewingData, isLoading: sewingLoading } = useSewingPlans({
    page: sewingPage,
    limit: sewingPageSize,
    search: sewingSearch || undefined,
    date: sewingDate,
    excludeLists: [
      "Delivery (PO Selesai)",
      "PO Pelengkap Selesai",
      "PO Stok Pabrik Selesai",
      "Split Job Selesai",
    ],
    excludeListNameLike: "Filter",
    includeLists: sewingListFilter.length ? sewingListFilter : undefined,
  });
  const { data: sewingPlannerData, isLoading: sewingPlannerLoading } =
    useSewingPlanner();
  const sewingPlans = sewingData?.items || [];
  const masterPlanner = sewingData?.masterPlanner;
  const queryClient = useQueryClient();

  const computeCapacities = () => {
    const lines = masterPlanner?.plannerConfig?.lines || [];
    const full = lines.reduce(
      (sum: any, line: any) => sum + (Number(line.capacity) || 0),
      0
    );
    const half = lines.reduce((sum: any, line: any) => {
      const cap =
        (line as any).halfDayCapacity ??
        (line as any).half_day_capacity ??
        line.halfDayCapacity;
      const val = cap !== undefined ? Number(cap) : Number(line.capacity) || 0;
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
    return { full, half };
  };
  const { full: fullCap, half: halfCap } = computeCapacities();

  useEffect(() => {
    if (sewingPlans.length === 0 && sewingSelectedRowKeys.length) {
      setSewingSelectedRowKeys([]);
    }
  }, [sewingPlans.length, sewingSelectedRowKeys.length]);

  const rowSelectionSewing = {
    selectedRowKeys: sewingSelectedRowKeys,
    onChange: (keys: React.Key[]) => setSewingSelectedRowKeys(keys),
    preserveSelectedRowKeys: true,
  };

  const getStatusProduksi = (sisa: number | string | null | undefined) => {
    if (sisa === null || sisa === undefined || sisa === "—") return null;
    const num = Number(sisa);
    if (!Number.isFinite(num)) return null;
    return num > 0
      ? { label: "Aman", color: "green" as const }
      : { label: "Overload", color: "red" as const };
  };

  const getStatusDateline = (
    tglSewing?: string | null,
    dueDate?: string | null
  ) => {
    if (!tglSewing || !dueDate) return null;
    const sew = dayjs(tglSewing);
    const due = dayjs(dueDate);
    if (!sew.isValid() || !due.isValid()) return null;
    const diff = sew.startOf("day").diff(due.startOf("day"), "day");
    return diff >= 0
      ? { label: "Overdue", color: "red" as const }
      : { label: "On Schedule", color: "green" as const };
  };

  const getEvaluasi = (
    prod: { label: string; color: string } | null,
    dateline: { label: string; color: string } | null
  ) => {
    if (!prod || !dateline) return null;
    if (prod.label === "Overload" && dateline.label === "Overdue")
      return { label: "Segera Reschedule Produksi", color: "red" as const };
    if (prod.label === "Overload" && dateline.label === "On Schedule")
      return {
        label: "Produksi Padat, Potensi Terlambat",
        color: "gold" as const,
      };
    if (prod.label === "Aman" && dateline.label === "On Schedule")
      return { label: "Sesuai", color: "green" as const };
    return null;
  };

  const handleInlineTglChange = async (
    cardId: string,
    dateValue: dayjs.Dayjs | null
  ) => {
    if (!dateValue) return;
    const dateStr = dateValue.format("YYYY-MM-DD");
    try {
      setInlineTglUpdatingId(cardId);
      await bulkUpdateTglSewing({ cardIds: [cardId], date: dateStr });
      message.success("Tgl Sewing diperbarui");
      await queryClient.invalidateQueries({
        queryKey: ["sewing-plans"],
        exact: false,
      });
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || "Gagal memperbarui Tgl Sewing"
      );
    } finally {
      setInlineTglUpdatingId(null);
    }
  };

  const handleBulkTglSubmit = async () => {
    if (!bulkTglDate) {
      message.warning("Pilih tanggal terlebih dahulu");
      return;
    }
    if (!sewingSelectedRowKeys.length) {
      message.warning("Pilih data terlebih dahulu");
      return;
    }
    try {
      setBulkUpdating(true);
      await bulkUpdateTglSewing({
        cardIds: sewingSelectedRowKeys.map(String),
        date: bulkTglDate,
      });
      message.success("Tgl Sewing diperbarui");
      setBulkTglModalOpen(false);
      setBulkTglDate(null);
      setSewingSelectedRowKeys([]);
      await queryClient.invalidateQueries({
        queryKey: ["sewing-plans"],
        exact: false,
      });
    } catch (e: any) {
      message.error(
        e?.response?.data?.message || "Gagal memperbarui Tgl Sewing"
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  const sewingColumns = [
    { title: "Nama PO", dataIndex: "name", key: "name" },
    {
      title: "Tanggal Masuk",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val: string) => formatDate(val),
    },
    {
      title: "Dateline",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (val: string) => formatDate(val),
    },
    { title: "Routing", dataIndex: "routing", key: "routing" },
    { title: "Produksi", dataIndex: "produksi", key: "produksi" },
    { title: "Produk", dataIndex: "productName", key: "productName" },
    { title: "Jml Produksi", dataIndex: "jmlProduksi", key: "jmlProduksi" },
    { title: "List", dataIndex: "listName", key: "listName" },
    {
      title: "Tanggal Sewing",
      dataIndex: "tglSewing",
      key: "tglSewing",
      render: (_: any, record: any) => (
        <DatePicker
          size="small"
          allowClear={false}
          format="DD/MM/YYYY"
          disabled={inlineTglUpdatingId === record.id}
          value={record.tglSewing ? dayjs(record.tglSewing) : undefined}
          onChange={(d) => handleInlineTglChange(record.id, d)}
        />
      ),
    },
    {
      title: "Sisa Kapasitas",
      dataIndex: "sisaKapasitas",
      key: "sisaKapasitas",
      render: (val: any) =>
        val === null || val === undefined ? "—" : val,
    },
    {
      title: "Status Produksi",
      key: "statusProduksi",
      render: (_: any, record: any) => {
        const st = getStatusProduksi(record.sisaKapasitas);
        return st ? <Tag color={st.color}>{st.label}</Tag> : "—";
      },
    },
    {
      title: "Status Dateline",
      key: "statusDateline",
      render: (_: any, record: any) => {
        const st = getStatusDateline(record.tglSewing, record.dueDate);
        return st ? <Tag color={st.color}>{st.label}</Tag> : "—";
      },
    },
    {
      title: "Evaluasi Jadwal",
      key: "evaluasiJadwal",
      render: (_: any, record: any) => {
        const prod = getStatusProduksi(record.sisaKapasitas);
        const dateSt = getStatusDateline(record.tglSewing, record.dueDate);
        const ev = getEvaluasi(prod, dateSt);
        return ev ? <Tag color={ev.color}>{ev.label}</Tag> : "—";
      },
    },
  ];

  useEffect(() => {
    const loadLists = async () => {
      try {
        const listRes = await fetchLists("7c81b8c7-9d57-4a65-9e93-9c5d44218071");
        const excludeHard = new Set([
          "Delivery (PO Selesai)",
          "PO Pelengkap Selesai",
          "PO Stok Pabrik Selesai",
          "Split Job Selesai",
        ]);
        const opts =
          listRes.data
            ?.filter(
              (l: any) =>
                l?.name &&
                !excludeHard.has(l.name) &&
                !String(l.name).toLowerCase().includes("filter")
            )
            .map((l: any) => ({ label: l.name, value: l.name })) || [];
        setListOptions(opts);
      } catch {
        // ignore
      }
    };
    loadLists();
  }, [currentWorkspace?.id]);

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title="Sewing"
        width="90vw"
        height="100vh"
        styles={{
          body: {
            padding: "1rem",
          },
        }}
      >
        <Tabs
          defaultActiveKey="input"
          items={[
            {
              key: "input",
              label: "Input",
              children: (
                <div style={{ padding: "8px 0" }}>
                  <div className="mb-2">
                    <Space wrap>
                      <AntInput
                        placeholder="Cari nama PO…"
                        allowClear
                        value={sewingSearchInput}
                        onChange={(e) => setSewingSearchInput(e.target.value)}
                        onPressEnter={() => {
                          setSewingSearch(sewingSearchInput);
                          setSewingPage(1);
                        }}
                        style={{ width: 220 }}
                      />
                      <DatePicker
                        allowClear
                        placeholder="Filter tanggal sewing"
                        format="DD/MM/YYYY"
                        value={sewingDate ? dayjs(sewingDate) : undefined}
                        onChange={(val) => {
                          const dateStr = val ? val.format("YYYY-MM-DD") : undefined;
                          setSewingDate(dateStr);
                          setSewingPage(1);
                        }}
                      />
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="Pilih list"
                        style={{ minWidth: 200 }}
                        value={sewingListFilter}
                        onChange={(vals) => {
                          setSewingListFilter(vals as string[]);
                          setSewingPage(1);
                        }}
                        options={listOptions}
                      />
                      {(fullCap || halfCap) && (
                        <Typography.Text type="secondary">
                          Kapasitas: Full {fullCap || 0} | Half {halfCap || 0}
                        </Typography.Text>
                      )}
                    </Space>
                  </div>
                  {sewingLoading ? (
                    <Typography.Text type="secondary">Loading…</Typography.Text>
                  ) : sewingPlans.length === 0 ? null : (
                    <Table
                      columns={sewingColumns}
                      dataSource={sewingPlans.map((p) => ({
                        ...p,
                        key: p.id,
                      }))}
                      size="small"
                      rowSelection={rowSelectionSewing}
                      pagination={{
                        current: sewingPage,
                        pageSize: sewingPageSize,
                        total: sewingData?.total || 0,
                        onChange: (page, pageSize) => {
                          setSewingPage(page);
                          setSewingPageSize(pageSize);
                        },
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total}`,
                      }}
                      scroll={{ y: 320 }}
                    />
                  )}
                  {sewingSelectedRowKeys.length > 0 && (
                    <div className="mt-2" style={{ textAlign: "right" }}>
                      <Button
                        type="primary"
                        onClick={() => setBulkTglModalOpen(true)}
                      >
                        Bulk Edit Tgl Sewing ({sewingSelectedRowKeys.length})
                      </Button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "planner",
              label: "Planner",
              children: (
                <div style={{ padding: "8px 0" }}>
                  {sewingPlannerLoading ? (
                    <Typography.Text type="secondary">Loading…</Typography.Text>
                  ) : (sewingPlannerData || []).length === 0 ? (
                    <Typography.Text type="secondary">No data</Typography.Text>
                  ) : (
                    <Table
                      columns={[
                        {
                          title: "Tgl Sewing",
                          dataIndex: "tglSewing",
                          key: "tglSewing",
                          render: (val: string) => formatDate(val),
                        },
                        {
                          title: "Jumlah Produksi",
                          dataIndex: "jmlProduksi",
                          key: "jmlProduksi",
                        },
                        {
                          title: "Kapasitas",
                          dataIndex: "kapasitasHarian",
                          key: "kapasitasHarian",
                        },
                        {
                          title: "Sisa Kapasitas",
                          dataIndex: "sisaKapasitas",
                          key: "sisaKapasitas",
                        },
                        {
                          title: "Status",
                          dataIndex: "statusProduksi",
                          key: "statusProduksi",
                        },
                        {
                          title: "Overdue (hari)",
                          dataIndex: "overdueDays",
                          key: "overdueDays",
                        },
                      ]}
                      dataSource={(sewingPlannerData || []).map((p) => ({
                        ...p,
                        key: p.id,
                      }))}
                      size="small"
                      pagination={false}
                      scroll={{ y: 320 }}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={bulkTglModalOpen}
        title="Bulk Edit Tgl Sewing"
        onCancel={() => setBulkTglModalOpen(false)}
        onOk={handleBulkTglSubmit}
        confirmLoading={bulkUpdating}
        okText="Simpan"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>Pilih Tgl Sewing baru</Typography.Text>
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            value={bulkTglDate ? dayjs(bulkTglDate) : undefined}
            onChange={(d) =>
              setBulkTglDate(d ? d.format("YYYY-MM-DD") : null)
            }
          />
          <Typography.Text type="secondary">
            {sewingSelectedRowKeys.length} item akan diperbarui.
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
};

export default SewingModal;
