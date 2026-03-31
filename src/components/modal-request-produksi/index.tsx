import {
  getAllRequests,
  updateProductionReceived,
  updateRequest,
} from "@api/accurate";
import { useUpdateRequestFields } from "@hooks/accurate";
import { ApiResponse, RequestItem } from "@myTypes/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Select,
  message,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  DatePicker,
} from "antd";
import { EditOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import { Factory, Filter, RefreshCw, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { formatRequestQuantity } from "@utils/request-format";
import UserSelectionForModal from "@components/UserSelectionForModal";
import { useAccountListForModal } from "@hooks/account";
import { usePermissions } from "@hooks/account";

const formatDateValue = (value?: string | number | Date) => {
  if (!value) return "-";
  const date = dayjs(value);
  if (!date.isValid()) return "-";
  return date.format("DD MMM YYYY HH:mm");
};

const buildCardUrl = (record: RequestItem) => {
  const cardId = record.cardId ?? record.card_id;
  const boardId = record.boardId ?? record.board_id;
  const workspaceId = record.workspaceId ?? record.workspace_id;
  const listId = record.listId ?? record.list_id;

  if (!cardId || !boardId || !workspaceId) {
    return undefined;
  }

  const params = new URLSearchParams();
  params.set("cardId", cardId);
  if (listId) {
    params.set("listId", listId);
  }

  return `/workspace/${workspaceId}/board/${boardId}?${params.toString()}`;
};

const { Title, Text } = Typography;

interface ModalRequestProduksiProps {
  open: boolean;
  onClose: () => void;
}

type BasicStatusFilter = "SUDAH" | "BELUM";

const ModalRequestProduksi: React.FC<ModalRequestProduksiProps> = ({
  open,
  onClose,
}) => {
  const { isSuperAdmin } = usePermissions();
  const { workspaceId } = useParams();
  const resolvedWorkspaceId = Array.isArray(workspaceId)
    ? (workspaceId[0] as string)
    : ((workspaceId as string) || "");
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [requestSentValues, setRequestSentValues] = useState<
    Record<string, number>
  >({});
  const [receivedByOverrides, setReceivedByOverrides] = useState<
    Record<string, string>
  >({});
  const [filterDikirim, setFilterDikirim] =
    useState<BasicStatusFilter | null>(null);
  const [filterDiterima, setFilterDiterima] =
    useState<BasicStatusFilter | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("");
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [scanInput, setScanInput] = useState("");
  const [shortIdFilter, setShortIdFilter] = useState<number | null>(null);
  const lastProcessedShortIdRef = useRef<number | null>(null);
  const scanInputRef = useRef<any | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { data: accountListModal } = useAccountListForModal({
    workspaceId: resolvedWorkspaceId,
  });
  const accountOptions = useMemo(() => {
    if (!accountListModal?.data) return [];
    return accountListModal.data.map((item) => ({
      value: item.id,
      label: item.username,
    }));
  }, [accountListModal]);

  const debouncedRefetch = useRef(
    debounce(() => {
      refetch();
    }, 300)
  ).current;
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchTerm(value.trim());
    }, 400)
  ).current;

  // Build filter object based on current filter states
  const filterParams = useMemo(() => {
    const baseFilter: Record<string, any> = {
      workspace_id: resolvedWorkspaceId,
      isVerified: true,
      isRejected: false,
    };

    if (requestTypeFilter) {
      baseFilter.requestType = requestTypeFilter;
    }

    if (labelFilter) {
      baseFilter.labelName = labelFilter;
    }

    if (filterDikirim) {
      switch (filterDikirim) {
        case "SUDAH":
          baseFilter.requestSentStatus = "SENT";
          break;
        case "BELUM":
          baseFilter.requestSentStatus = "NOT_SENT";
          break;
      }
    }

    if (filterDiterima) {
      switch (filterDiterima) {
        case "SUDAH":
          baseFilter.productionReceived = true;
          break;
        case "BELUM":
          baseFilter.productionReceived = false;
          break;
      }
    }

    if (dateRange[0] || dateRange[1]) {
      baseFilter.requestReceived = {
        from: dateRange[0]?.startOf("day").toISOString(),
        to: dateRange[1]?.endOf("day").toISOString(),
      };
    }

    if (shortIdFilter !== null) {
      baseFilter.shortId = shortIdFilter;
    }

    if (searchTerm) {
      baseFilter.search = searchTerm;
    }

    return baseFilter;
  }, [
    resolvedWorkspaceId,
    requestTypeFilter,
    labelFilter,
    filterDikirim,
    filterDiterima,
    dateRange,
    shortIdFilter,
    searchTerm,
  ]);

  const resetFilters = () => {
    setFilterDikirim(null);
    setFilterDiterima(null);
    setLabelFilter("");
    setRequestTypeFilter("");
    setDateRange([null, null]);
    setSearchInput("");
    setSearchTerm("");
    setScanInput("");
    setShortIdFilter(null);
    lastProcessedShortIdRef.current = null;
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const { data, isLoading, refetch } = useQuery<ApiResponse<RequestItem>>({
    queryKey: [
      "requests",
      resolvedWorkspaceId,
      pagination.page,
      pagination.limit,
      "production",
      filterParams,
    ],
    queryFn: () =>
      getAllRequests(pagination.page, pagination.limit, filterParams),
    enabled: open && !!resolvedWorkspaceId,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (data) {
      setLastRefreshedAt(new Date());
    }
  }, [data]);

  useEffect(
    () => () => {
      debouncedSearch.cancel();
    },
    [debouncedSearch]
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scanInputRef.current?.focus?.();
      }, 50);
    }
  }, [open]);

  const handleScanSubmit = (value?: string) => {
    const raw = (value ?? scanInput).trim();
    const numeric = Number(raw);
    if (!raw) {
      setShortIdFilter(null);
      lastProcessedShortIdRef.current = null;
      return;
    }
    if (Number.isNaN(numeric)) {
      message.warning("Short ID tidak valid");
      return;
    }
    setShortIdFilter(numeric);
    lastProcessedShortIdRef.current = null;
    setScanInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchInput(value);
    if (value.trim() === "") {
      debouncedSearch.cancel();
      setSearchTerm("");
    } else {
      debouncedSearch(value);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSearchSubmit = () => {
    debouncedSearch.cancel();
    setSearchTerm(searchInput.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, requestSent }: { id: string; requestSent: number }) =>
      updateRequest(id, requestSent),
    onSuccess: () => {
      message.success("Jumlah dikirim berhasil diperbarui");
      queryClient.invalidateQueries({
        queryKey: ["requests", resolvedWorkspaceId],
      });
      debouncedRefetch();
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      message.error("Gagal memperbarui jumlah dikirim");
    },
  });

  const updateProductionReceivedMutation = useMutation({
    mutationFn: ({
      id,
      productionReceived,
    }: {
      id: string;
      productionReceived: boolean;
    }) => updateProductionReceived(id, productionReceived),
    onSuccess: () => {
      message.success("Status produksi diterima berhasil diperbarui");
      queryClient.invalidateQueries({
        queryKey: ["requests", resolvedWorkspaceId],
      });
      debouncedRefetch();
    },
    onError: (error) => {
      console.error("Error updating production received:", error);
      message.error("Gagal memperbarui status produksi diterima");
    },
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      setLastRefreshedAt(new Date());
    } catch (error) {
      message.error("Gagal refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formattedLastRefresh = lastRefreshedAt
    ? lastRefreshedAt.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    : "Belum pernah";

  const formatRequestTypeLabel = (type: string) =>
    type
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()
      )
      .join(" ");

  const requestTypeOptions = useMemo(() => {
    const defaults = ["NEW_ORDER", "REJECT", "KEKURANGAN", "KESALAHAN"];
    const collected = new Set(defaults);

    data?.data.forEach((item) => {
      const derivedType =
        (item as any).request_type ?? (item as any).requestType ?? "";
      if (derivedType) {
        collected.add(String(derivedType).toUpperCase());
      }
    });

    return Array.from(collected).filter(Boolean);
  }, [data]);

  const labelOptions = useMemo(() => ["Ozzy", "Steady"], []);

  const dropdownStatusOptions: { label: string; value: BasicStatusFilter }[] = [
    { label: "Sudah", value: "SUDAH" },
    { label: "Belum", value: "BELUM" },
  ];

  const { mutate: updateRequestFields } = useUpdateRequestFields();
  const undoDoneMutation = useMutation({
    mutationFn: (id: string) => updateRequest(id, { is_done: false }),
    onMutate: (id) => setUnlockingId(id),
    onSuccess: () => {
      message.success("Request dibuka untuk diedit");
      queryClient.invalidateQueries({ queryKey: ["requests", resolvedWorkspaceId] });
      debouncedRefetch();
    },
    onError: () => {
      message.error("Gagal membuka request");
    },
    onSettled: () => setUnlockingId(null),
  });

  const handleUnlockRequest = (record: RequestItem) => {
    if (record.is_done || record.isDone) {
      undoDoneMutation.mutate(record.id);
    }
  };

  const handleSendRequest = (id: string) => {
    const requestSent = requestSentValues[id];
    if (requestSent !== undefined && requestSent > 0) {
      updateRequestMutation.mutate({ id, requestSent });
      setRequestSentValues((prev) => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
    }
  };

  const handleProductionReceived = (id: string, checked: boolean) => {
    updateProductionReceivedMutation.mutate({
      id,
      productionReceived: checked,
    });
  };

  useEffect(() => {
    if (data?.pagination?.total) {
      setPagination((prev) => ({
        ...prev,
        total: data.pagination!.total,
      }));
    }
  }, [data]);

  const columns = [
    {
      title: "Tanggal",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      ellipsis: true,
      render: (_: any, record: RequestItem) => (
        <Text>{formatDateValue(record.createdAt)}</Text>
      ),
    },
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      width: 180,
      render: (_: string, record: RequestItem) => {
        const href = buildCardUrl(record);
        const content = record.cardName || "-";
        if (!href) {
          return (
            <Tooltip title={content}>
              <Text strong>{content}</Text>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Lihat PO">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              {content}
            </a>
          </Tooltip>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "requestType",
      key: "request_type",
      width: 120,
      render: (type: string) => {
        const normalized = (type || "").toUpperCase();
        const getTypeColor = (t: string) => {
          switch (t) {
            case "NEW_ORDER":
              return "blue";
            case "REJECT":
              return "red";
            case "KEKURANGAN":
              return "orange";
            case "KESALAHAN":
              return "volcano";
            default:
              return "default";
          }
        };
        return (
          <Tag color={getTypeColor(normalized)}>
            {normalized.replace("_", " ")}
          </Tag>
        );
      },
    },
    {
      title: "Label",
      key: "card_labels",
      width: 70,
      render: (_: unknown, record: RequestItem) => {
        const labels = record.card_labels || (record as any).cardLabels || [];
        const hasOzzy = labels.some((l: any) => l.toLowerCase() === "ozzy");
        const hasSteady = labels.some((l: any) => l.toLowerCase() === "steady");
        if (!hasOzzy && !hasSteady) return <Tag color="default">-</Tag>;
        return (
          <Space size={4}>
            {hasOzzy && <Tag color="purple">Ozzy</Tag>}
            {hasSteady && <Tag color="cyan">Steady</Tag>}
          </Space>
        );
      },
    },

    {
      title: "Item",
      dataIndex: "itemName",
      key: "requested_item_id",
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Jumlah",
      key: "request_amount",
      width: 120,
      align: "center" as const,
      render: (_: any, record: RequestItem) => (
        <Text strong>
          {formatRequestQuantity(record.requestAmount)} {record.satuan || ""}
        </Text>
      ),
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 180 }}>
            {text || "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Jumlah Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      width: 140,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const hasSent = record.requestSent !== null && record.requestSent !== 0;
        return hasSent ? (
          <Tag color="green">
            {formatRequestQuantity(record.requestSent)} {record.satuan || ""}
          </Tag>
        ) : (
          <Tag color="default">Belum Dikirim</Tag>
        );
      },
    },
    {
      title: "Diterima Oleh",
      dataIndex: "receivedBy",
      key: "receivedBy",
      width: 200,
      render: (_value: string, record: RequestItem) => {
        const resolvedValue =
          receivedByOverrides[record.id] ??
          record.receivedBy ??
          (record as any)?.received_by ??
          undefined;

        return (
          <UserSelectionForModal
            value={resolvedValue}
            placeholder="Pilih penerima"
            onChange={(selectedUserId: string) => {
              setReceivedByOverrides((prev) => ({
                ...prev,
                [record.id]: selectedUserId,
              }));
              updateRequestFields({
                id: record.id,
                updates: { received_by: selectedUserId },
              });
            }}
            disabled={record.is_done || record.isDone}
            workspaceId={resolvedWorkspaceId}
          />
        );
      },
    },
    {
      title: "Diterima",
      key: "productionReceived",
      width: 160,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const productionReceived =
          record.productionReceived ?? record.productionRecieved ?? false;
        const isDone = record.is_done || record.isDone;
        const resolvedReceiver =
          receivedByOverrides[record.id] ??
          record.receivedBy ??
          (record as any)?.received_by ??
          null;
        const sender =
          record.sentBy ?? (record as any)?.sent_by ?? null;
        const disabled =
          !isSuperAdmin() || isDone || !sender || !resolvedReceiver;

        return (
          <Checkbox
            checked={productionReceived}
            onChange={(e) =>
              handleProductionReceived(record.id, e.target.checked)
            }
            disabled={disabled}
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const isDone = record.is_done || record.isDone;
        return (
          <Tooltip
            title={
              isDone
                ? "Edit (buka ulang)"
                : "Sudah terbuka untuk diedit"
            }
          >
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!isDone}
              loading={unlockingId === record.id}
              onClick={() => handleUnlockRequest(record)}
            />
          </Tooltip>
        );
      },
    },
  ];

  const totalRequests = data?.pagination?.total || 0;
  const activeFiltersCount = [
    filterDikirim !== null,
    filterDiterima !== null,
    Boolean(labelFilter),
    Boolean(requestTypeFilter),
    Boolean(searchTerm),
    shortIdFilter !== null,
  ].filter(Boolean).length;
  const activeDateFilter = Boolean(dateRange[0] || dateRange[1]);
  const totalActiveFilters = activeFiltersCount + (activeDateFilter ? 1 : 0);

  const resolveReceivedBy = (record: RequestItem) =>
    receivedByOverrides[record.id] ??
    record.receivedBy ??
    (record as any)?.received_by ??
    null;

  useEffect(() => {
    if (shortIdFilter === null || !data?.data) return;
    if (lastProcessedShortIdRef.current === shortIdFilter) return;

    const match = data.data.find((record) => {
      const raw =
        (record as any).short_id ?? (record as any).shortId ?? undefined;
      const parsed = Number(raw);
      return !Number.isNaN(parsed) && parsed === shortIdFilter;
    });

    if (!match) return;
    lastProcessedShortIdRef.current = shortIdFilter;

    const receiver = resolveReceivedBy(match);
    const markReceived = async (receiverId?: string | null) => {
      if (receiverId) {
        setReceivedByOverrides((prev) => ({
          ...prev,
          [match.id]: receiverId,
        }));
      }
      handleProductionReceived(match.id, true);
    };

    if (receiver) {
      void markReceived(receiver);
      return;
    }

    let selectedReceiver: string | null = null;
    Modal.confirm({
      title: "Isi penerima",
      content: (
        <Select
          placeholder="Pilih penerima"
          style={{ width: "100%" }}
          showSearch
          options={accountOptions}
          optionFilterProp="label"
          onChange={(userId: string) => {
            selectedReceiver = userId;
          }}
        />
      ),
      okText: "Simpan & Tandai Diterima",
      styles: {
        body: {
          padding: '1rem',
        },
      },
      cancelText: "Batal",
      onOk: async () => {
        if (!selectedReceiver) {
          message.warning("Pilih penerima terlebih dahulu");
          return Promise.reject();
        }
        await updateRequestFields({
          id: match.id,
          updates: { received_by: selectedReceiver },
        });
        await markReceived(selectedReceiver);
        return true;
      },
      onCancel: () => {
        selectedReceiver = null;
      },
    });
  }, [shortIdFilter, data, updateRequestFields]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="95%"
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Factory size={20} style={{ color: "#1890ff" }} />
          <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
            Manajemen Request Produksi
          </Title>
          <Badge
            count={totalRequests}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#666",
              border: "1px solid #d9d9d9",
            }}
          />
        </div>
      }
      styles={{
        body: {
          padding: "24px",
          backgroundColor: "#fafafa",
        },
        header: {
          backgroundColor: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: "16px 24px",
        },
      }}
    >
      <Card
        size="small"
        style={{
          marginBottom: 20,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
        }}
        title={
          <Space align="center">
            <Filter size={16} style={{ color: "#1890ff" }} />
            <span style={{ fontWeight: 600 }}>🔍 Filter Requests</span>
            {totalActiveFilters > 0 && (
              <Badge
                count={totalActiveFilters}
                style={{ backgroundColor: "#faad14" }}
              />
            )}
          </Space>
        }
        extra={
          <Space size="small" align="center">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw size={14} />}
              onClick={handleRefresh}
              loading={isRefreshing}
              style={{
                fontSize: "12px",
                height: "24px",
                padding: "0 8px",
              }}
            >
              Refresh
            </Button>
            <Input
              placeholder="Scan Diterima"
              allowClear
              size="small"
              value={scanInput}
              ref={scanInputRef as any}
              onChange={(e) => {
                setScanInput(e.target.value);
                if (!e.target.value.trim()) {
                  setShortIdFilter(null);
                }
              }}
              onPressEnter={() => handleScanSubmit()}
              style={{ width: 180 }}
            />
            <span style={{ fontSize: 12, color: "#666" }}>
              Last refreshed: {formattedLastRefresh}
            </span>
            {totalActiveFilters > 0 && (
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
            )}
          </Space>
        }
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Tanggal (Dari - Sampai)
            </span>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange([dates?.[0] ?? null, dates?.[1] ?? null]);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              allowEmpty={[true, true]}
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Search
            </span>
            <Input
              placeholder="Cari produk, PO, atau deskripsi"
              allowClear
              value={searchInput}
              onChange={handleSearchChange}
              onPressEnter={handleSearchSubmit}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Type
            </span>
            <Select
              allowClear
              placeholder="Pilih type"
              value={requestTypeFilter || undefined}
              onChange={(value) => {
                setRequestTypeFilter(value || "");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { value: "", label: "Semua Type" },
                ...requestTypeOptions.map((type) => ({
                  value: type,
                  label: formatRequestTypeLabel(type),
                })),
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Label
            </span>
            <Select
              allowClear
              placeholder="Pilih label"
              value={labelFilter || undefined}
              onChange={(value) => {
                setLabelFilter(value || "");
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={[
                { value: "", label: "Semua Label" },
                ...labelOptions.map((label) => ({
                  value: label,
                  label,
                })),
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Dikirim
            </span>
            <Select
              allowClear
              placeholder="Semua"
              value={filterDikirim ?? undefined}
              onChange={(value) => {
                setFilterDikirim((value as BasicStatusFilter) ?? null);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={dropdownStatusOptions}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
              Diterima
            </span>
            <Select
              allowClear
              placeholder="Semua"
              value={filterDiterima ?? undefined}
              onChange={(value) => {
                setFilterDiterima((value as BasicStatusFilter) ?? null);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={dropdownStatusOptions}
            />
          </div>
        </div>
      </Card>

      {/* Enhanced Table */}
      <Card
        style={{
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Spin size="large" />
            <Text type="secondary">Memuat data request...</Text>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div style={{ padding: 40 }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div style={{ textAlign: "center" }}>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    {totalActiveFilters > 0
                      ? "Tidak ada data yang sesuai dengan filter"
                      : "Belum ada request produksi"}
                  </Text>
                  {totalActiveFilters > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Button
                        type="primary"
                        ghost
                        onClick={resetFilters}
                      >
                        Reset Filter
                      </Button>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data?.data || []}
            loading={isLoading}
            rowKey="id"
            scroll={{ x: 1400 }}
            size="middle"
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: data?.pagination?.total || 0,
              onChange: (page, pageSize) =>
                setPagination({ ...pagination, page, limit: pageSize }),
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} request`,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            rowClassName={(record, index) =>
              index % 2 === 0 ? "table-row-light" : "table-row-dark"
            }
            style={
              {
                "--table-row-light": "#ffffff",
                "--table-row-dark": "#fafafa",
              } as React.CSSProperties
            }
          />
        )}
      </Card>

      <style jsx>{`
        .table-row-light {
          background-color: var(--table-row-light);
        }
        .table-row-dark {
          background-color: var(--table-row-dark);
        }
        .ant-table-thead > tr > th {
          background-color: #f8f9fa !important;
          border-bottom: 2px solid #e9ecef !important;
          font-weight: 600 !important;
          color: #495057 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </Modal>
  );
};

export default ModalRequestProduksi;
