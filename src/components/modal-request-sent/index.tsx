import {
  getAllRequests,
  markRequestDone,
  updateRequest,
  updateWarehouseReturn,
  deleteRequest,
} from "@api/accurate";
import { useUpdateRequestFields } from "@hooks/accurate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
  Card,
  Space,
  Tooltip,
} from "antd";
import type { AxiosError } from "axios";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatRequestQuantity } from "@utils/request-format";
import { Filter, RefreshCw, RotateCcw, Warehouse } from "lucide-react";
import {
  ApiResponse,
  BeliStatus,
  DEFAULT_BELI_STATUS,
  RequestItem,
} from "@myTypes/request";
import UserSelectionForModal from "@components/UserSelectionForModal";

interface ModalRequestSentProps {
  open: boolean;
  onClose: () => void;
}

type BeliSelection = BeliStatus | "-";

const extractApiErrorReason = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  const axiosError = error as AxiosError;
  const responseData = axiosError?.response?.data as any;
  if (responseData?.reason) return responseData.reason;
  if (responseData?.error) return responseData.error;
  if (responseData?.message) return responseData.message;
  if (axiosError?.message) return axiosError.message;
  if (error instanceof Error) return error.message;
  return undefined;
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

const formatReceivedAmount = (value?: number | string | null): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value !== undefined && value !== null ? String(value) : "0.00";
  }
  return numeric.toFixed(2);
};

const formatDateValue = (value?: string | number | Date) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ModalRequestSent: React.FC<ModalRequestSentProps> = ({
  open,
  onClose,
}): JSX.Element => {
  const [requestSentValues, setRequestSentValues] = useState<
    Record<string, number>
  >({});
  const [requestReceivedValues, setRequestReceivedValues] = useState<
    Record<string, number>
  >({});
  const [beliValues, setBeliValues] = useState<Record<string, BeliSelection>>(
    {}
  );
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [filterBelumDikirim, setFilterBelumDikirim] = useState(false);
  const [filterBelumDiterima, setFilterBelumDiterima] = useState(false);
  const [filterBelumBeli, setFilterBelumBeli] = useState(false);
  const [filterBelumDiotorisasi, setFilterBelumDiotorisasi] = useState(false);
  const [editingTerpakaiId, setEditingTerpakaiId] = useState<string | null>(
    null
  );
  const [editingSentRequestId, setEditingSentRequestId] = useState<
    string | null
  >(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null
  );
  const [reopenedIds, setReopenedIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  // Build filter object based on current filter states
  const filterParams = useMemo(() => {
    const baseFilter: Record<string, any> = {
      isRejected: false,
    };

    // Handle verification filter
    if (filterBelumDiotorisasi) {
      baseFilter.isVerified = false;
    } else {
      baseFilter.isVerified = true;
    }

    // Handle production received filter
    if (filterBelumDikirim) {
      baseFilter.requestSent = null;
    }
    if (filterBelumDiterima) {
      baseFilter.productionReceived = false;
    }
    if (filterBelumBeli) {
      baseFilter.beli = DEFAULT_BELI_STATUS;
      baseFilter.excludeType = "persediaan";
    }

    return baseFilter;
  }, [
    filterBelumDikirim,
    filterBelumDiterima,
    filterBelumDiotorisasi,
    filterBelumBeli,
  ]);

  const { data, isLoading, refetch } = useQuery<ApiResponse<RequestItem>>({
    queryKey: [
      "requests",
      pagination.page,
      pagination.limit,
      "gudang",
      filterParams,
    ] as const,
    queryFn: () =>
      getAllRequests(pagination.page, pagination.limit, filterParams),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const [requestLeftValues, setRequestLeftValues] = useState<
    Record<string, number | undefined>
  >({});

  useEffect(() => {
    if (!data) return;

    const initialSentValues: Record<string, number> = {};
    const initialReceivedValues: Record<string, number> = {};
    const initialLeftValues: Record<string, number | undefined> = {};
    const initialBeliValues: Record<string, BeliSelection> = {};
    data.data.forEach((item) => {
      const numericSent = Number(item.requestSent);
      if (!Number.isNaN(numericSent)) {
        initialSentValues[item.id] = numericSent;
      }

      const leftFromRecord = item.requestLeft ?? item.request_left ?? undefined;
      if (leftFromRecord !== undefined && leftFromRecord !== null) {
        const leftNumber = Number(leftFromRecord);
        if (!Number.isNaN(leftNumber)) {
          initialLeftValues[item.id] = Math.max(leftNumber, 0);
        }
      }
      const numericReceived = Number(item.requestReceived ?? 0);
      if (!Number.isNaN(numericReceived)) {
        initialReceivedValues[item.id] = numericReceived;
      }
      initialBeliValues[item.id] = item.beli ?? "-";
    });
    setRequestSentValues((prev) => ({
      ...prev,
      ...initialSentValues,
    }));
    setRequestLeftValues(initialLeftValues);
    setRequestReceivedValues((prev) => ({
      ...prev,
      ...initialReceivedValues,
    }));
    setBeliValues(initialBeliValues);
    setPagination((prev) => ({
      ...prev,
      total: data.pagination?.total || 0,
    }));
  }, [data]);

  const { mutate: sendRequest } = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      updateRequest(id, amount),
    onSuccess: (_, { id }) => {
      message.success("Lihat Request (Gudang) successfully");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to send request");
    },
  });

  const { mutate: updateBeliStatus } = useMutation({
    mutationFn: ({ id, beli }: { id: string; beli: BeliStatus }) =>
      updateRequest(id, { beli }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update beli status");
    },
  });

  const { mutate: updateRequestFields } = useUpdateRequestFields();

  const { mutate: updateRequestReceivedAndLeft } = useMutation({
    mutationFn: ({
      id,
      request_received,
      request_left,
    }: {
      id: string;
      request_received: number;
      request_left: number;
    }) =>
      updateRequest(id, {
        requestReceived: request_received,
        requestLeft: request_left,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update used quantity");
    },
  });

  const { mutate: updateWarehouseReturnStatus } = useMutation({
    mutationFn: ({ id, returned }: { id: string; returned: boolean }) =>
      updateWarehouseReturn(id, returned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      message.success("Warehouse return status updated");
    },
    onError: () => {
      message.error("Failed to update warehouse return status");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => {
      message.success("Request deleted");
      setEditingSentRequestId(null);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to delete request");
    },
  });

  const reopenRequestMutation = useMutation({
    mutationFn: (id: string) => updateRequest(id, { is_done: false }),
    onMutate: (id) => {
      setReopenedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      return id;
    },
    onSuccess: (_, id) => {
      message.success("Request dibuka untuk diedit");
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (error, id) => {
      setReopenedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      console.error("Failed to reopen request", error);
      message.error("Gagal membuka request");
    },
  });

  const [markingDone, setMarkingDone] = useState<string | null>(null);

  const requestReceivedDebounceMap = useRef<
    Record<string, (payload: { amount: number; left: number }) => void>
  >({});

  const attemptSendRequest = (id: string): boolean => {
    const amount = requestSentValues[id];
    if (!amount) {
      message.error("Please enter an amount");
      return false;
    }

    sendRequest({ id, amount });
    return true;
  };

  const handleSendRequest = (id: string): void => {
    attemptSendRequest(id);
  };

  const handleBeliChange = (id: string, value: BeliSelection) => {
    setBeliValues((prev) => ({
      ...prev,
      [id]: value,
    }));
    if (value === "-") {
      return;
    }
    updateBeliStatus({ id, beli: value });
  };

  const handleWarehouseReturn = (id: string, checked: boolean) => {
    updateWarehouseReturnStatus({ id, returned: checked });
  };
  const handleRequestReceivedUpdate = (
    id: string,
    amount: number,
    left: number
  ) => {
    if (!requestReceivedDebounceMap.current[id]) {
      requestReceivedDebounceMap.current[id] = debounce(
        (payload: { amount: number; left: number }) => {
          updateRequestReceivedAndLeft({
            id,
            request_received: payload.amount,
            request_left: payload.left,
          });
        },
        500
      );
    }

    requestReceivedDebounceMap.current[id]({ amount, left });
  };

  const handleRequestReceivedChange = (
    id: string,
    rawValue: string,
    sentValue: number
  ) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const normalizedValue = Number.isNaN(numericValue) ? 0 : numericValue;
    const leftAmount = Math.max(sentValue - normalizedValue, 0);

    setRequestReceivedValues((prev) => ({
      ...prev,
      [id]: normalizedValue,
    }));

    setRequestLeftValues((prev) => ({
      ...prev,
      [id]: leftAmount,
    }));

    handleRequestReceivedUpdate(id, normalizedValue, leftAmount);
  };

  const getRequestSentValue = (record: RequestItem): number => {
    const stored = requestSentValues[record.id];
    if (stored !== undefined && !Number.isNaN(stored)) {
      return stored;
    }
    const numericSent = Number(record.requestSent ?? 0);
    return Number.isNaN(numericSent) ? 0 : numericSent;
  };

  const getRequestLeftValue = (record: RequestItem): number | undefined => {
    const stored = requestLeftValues[record.id];
    if (stored !== undefined && !Number.isNaN(stored)) {
      return stored;
    }
    const leftFromRecord =
      record.requestLeft ?? record.request_left ?? undefined;
    if (
      leftFromRecord === undefined ||
      leftFromRecord === null ||
      Number.isNaN(Number(leftFromRecord))
    ) {
      return undefined;
    }
    return Number(leftFromRecord);
  };

  const parseNumericValue = (
    value: number | string | null | undefined
  ): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? undefined : numeric;
  };

  const getResolvedRequestSent = (record: RequestItem): number | undefined => {
    const fromState = parseNumericValue(requestSentValues[record.id]);
    if (fromState !== undefined) return fromState;
    return parseNumericValue(record.requestSent);
  };

  const getResolvedRequestReceived = (
    record: RequestItem
  ): number | undefined => {
    const fromState = parseNumericValue(requestReceivedValues[record.id]);
    if (fromState !== undefined) return fromState;
    return parseNumericValue(record.requestReceived);
  };

  const getResolvedRequestLeft = (record: RequestItem): number | undefined => {
    const fromState = parseNumericValue(requestLeftValues[record.id]);
    if (fromState !== undefined) return fromState;
    return parseNumericValue(record.requestLeft ?? record.request_left);
  };

  const getCabangValue = (record: RequestItem): string => {
    const rawCabang =
      record.cabang ??
      record.card_location ??
      record.cardLocation ??
      record.location;
    if (!rawCabang) return "";
    const normalized = String(rawCabang).trim();
    return normalized;
  };

  const getMissingDoneFields = (record: RequestItem): string[] => {
    const missing: string[] = [];
    if (getResolvedRequestSent(record) === undefined) {
      missing.push("Jumlah Dikirim");
    }
    if (getResolvedRequestReceived(record) === undefined) {
      missing.push("Terpakai");
    }
    if (getResolvedRequestLeft(record) === undefined) {
      missing.push("Sisa Bahan");
    }
    if (!record.warehouseReturned) {
      missing.push("Kembali ke Gudang");
    }
    if (!getCabangValue(record)) {
      missing.push("Cabang");
    }
    return missing;
  };

  const isRowUnlocked = (record: RequestItem): boolean =>
    reopenedIds.has(record.id) || !(record.is_done || record.isDone);

  const isReadyForDone = (record: RequestItem): boolean =>
    getMissingDoneFields(record).length === 0;

  const isDoneButtonDisabled = (record: RequestItem): boolean => {
    const doneLocked = (record.is_done || record.isDone) && !isRowUnlocked(record);
    if (doneLocked || record.is_rejected || record.isRejected) {
      return true;
    }
    return !isReadyForDone(record);
  };

  const handleRequestLeftChange = (
    id: string,
    rawValue: string,
    sentValue: number
  ) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const normalizedValue = Number.isNaN(numericValue) ? 0 : numericValue;
    const sanitizedSent = Number.isNaN(sentValue) ? 0 : sentValue;
    const calculatedReceived = Math.max(sanitizedSent - normalizedValue, 0);

    setRequestLeftValues((prev) => ({
      ...prev,
      [id]: normalizedValue,
    }));

    setRequestReceivedValues((prev) => ({
      ...prev,
      [id]: calculatedReceived,
    }));

    handleRequestReceivedUpdate(id, calculatedReceived, normalizedValue);
  };

  const toggleTerpakaiEdit = (id: string) => {
    setEditingTerpakaiId((prev) => (prev === id ? null : id));
  };

  const toggleSentEdit = (id: string) => {
    setEditingSentRequestId((prev) => {
      if (prev === id) {
        if (!attemptSendRequest(id)) {
          return prev;
        }
        return null;
      }
      return id;
    });
  };

  const handleRequestSentChange = (id: string, rawValue: string) => {
    const numericValue = rawValue === "" ? 0 : Number(rawValue);
    const normalizedValue = Number.isNaN(numericValue) ? 0 : numericValue;

    setRequestSentValues((prev) => ({
      ...prev,
      [id]: normalizedValue,
    }));
  };

  const executeDeleteRequest = (id: string) => {
    if (deletingRequestId) return;
    setDeletingRequestId(id);
    deleteRequestMutation.mutate(id, {
      onSettled: () => {
        setDeletingRequestId(null);
      },
    });
  };

  const confirmDeleteRequest = (record: RequestItem) => {
    const content =
      record.invoice_no && record.invoice_no.trim()
        ? "Data sudah dipush ke Accurate, yakin ingin menghapus?"
        : `Are you sure you want to delete the request for "${record.itemName}"?`;

    Modal.confirm({
      title: "Delete request",
      content,
      okText: "Delete",
      okType: "danger",
      centered: true,
      onOk: () => executeDeleteRequest(record.id),
    });
  };

  const handleMarkDone = async (record: RequestItem) => {
    if (!isReadyForDone(record)) {
      const missingFields = getMissingDoneFields(record);
      message.warning(
        `Lengkapi ${missingFields.join(", ")} sebelum menandai Done.`
      );
      return;
    }

    setMarkingDone(record.id);
    try {
      await markRequestDone(record.id);
      message.success("Request marked as done!");
      setReopenedIds((prev) => {
        if (!prev.has(record.id)) return prev;
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
      refetch(); // Refresh the data
    } catch (err) {
      const reason = extractApiErrorReason(err);
      message.error(
        reason
          ? `Failed to mark request as done: ${reason}`
          : "Failed to mark request as done"
      );
    } finally {
      setMarkingDone(null);
    }
  };

  const columns = [
    {
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      ellipsis: true,
      width: 250,
      render: (_: unknown, record: RequestItem) => {
        const href = buildCardUrl(record);
        return href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            {record.cardName}
          </a>
        ) : (
          <span>{record.cardName}</span>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "requestType",
      key: "request_type",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Cabang",
      key: "cabang",
      ellipsis: true,
      width: 140,
      render: (_: unknown, record: RequestItem) => {
        const cabangValue = getCabangValue(record);
        return cabangValue ? (
          <Tag color="blue">{cabangValue}</Tag>
        ) : (
          <Tag color="default">Belum diisi</Tag>
        );
      },
    },
    {
      title: "Tanggal",
      dataIndex: "createdAt",
      key: "createdAt",
      ellipsis: true,
      width: 180,
      render: (_: unknown, record: RequestItem) => (
        <span>{formatDateValue(record.createdAt)}</span>
      ),
    },
    {
      title: "Item",
      dataIndex: "itemName",
      key: "requested_item_id",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Request",
      key: "request_amount",
      ellipsis: true,
      width: "auto",
      render: (_: any, record: RequestItem) => (
        <span>
          {formatRequestQuantity(record.requestAmount)} {record.satuan || ""}
        </span>
      ),
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      width: "auto",
    },
    {
      title: "Verified",
      key: "is_verified",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        if (record.isVerified) {
          return <Tag color="green">Verified</Tag>;
        }
        return <Tag color="default">Pending</Tag>;
      },
    },
    {
      title: "Jumlah Dikirim",
      dataIndex: "requestSent",
      key: "requestSent",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.01"
            value={
              requestSentValues[record.id] !== undefined
                ? requestSentValues[record.id]
                : record.requestSent !== null &&
                  record.requestSent !== undefined
                ? Number(record.requestSent)
                : ""
            }
            disabled={
              record.productionReceived ||
              editingSentRequestId !== record.id ||
              !isRowUnlocked(record)
            }
            className={`flex-1 ${
              record.productionReceived ||
              editingSentRequestId !== record.id ||
              !isRowUnlocked(record)
                ? "bg-gray-100 text-gray-500"
                : ""
            }`}
            style={{ width: "100%" }}
            onChange={(event) =>
              handleRequestSentChange(record.id, event.target.value)
            }
          />
          {!(
            record.productionReceived ??
            record.productionRecieved ??
            false
          ) && (
            <Tooltip
              title={
                editingSentRequestId === record.id ? "Editing" : "Enable edit"
              }
            >
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => toggleSentEdit(record.id)}
                className="text-gray-500 hover:text-blue-600"
              />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Dikirim Oleh",
      dataIndex: "sentBy",
      key: "sentBy",
      ellipsis: true,
      width: "auto",
      render: (value: string, record: RequestItem) => (
        <UserSelectionForModal
          value={value}
          placeholder="Pilih pengirim"
          onChange={(selectedUserId: string) => {
            updateRequestFields({
              id: record.id,
              updates: { sent_by: selectedUserId },
            });
          }}
        />
      ),
    },
    {
      title: "Request By",
      dataIndex: "receivedByName",
      key: "receivedByName",
      ellipsis: true,
      width: "auto",
      render: (value: string | undefined) => (
        <span>{value || "-"}</span>
      ),
    },
    {
      title: "Beli",
      key: "beli",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const isPersediaanProduct =
          (record?.type || "").toLowerCase() === "persediaan";
        const persistedValue =
          beliValues[record.id] !== undefined
            ? beliValues[record.id]
            : record.beli ?? "-";
        const isCompleted = record.is_done || record.isDone;
        // const disabled = isPersediaanProduct || isCompleted;
        return (
          <Select
            value={isPersediaanProduct ? DEFAULT_BELI_STATUS : persistedValue}
            options={[
              { value: "-", label: "-" },
              { value: "Ya", label: "Ya" },
              { value: "Tidak", label: "Tidak" },
            ]}
            onChange={(value) =>
              handleBeliChange(record.id, value as BeliSelection)
            }
            // disabled={disabled}
            style={{ width: "100%" }}
          />
        );
      },
    },
    // {
    //   title: "Action",
    //   key: "action",
    //   width: 50,
    //   render: (_: unknown, record: RequestItem) => (
    //     <Button
    //       type="primary"
    //       onClick={() => handleSendRequest(record.id)}
    //       disabled={!requestSentValues[record.id] || !!record.requestSent}
    //     >
    //       Kirim
    //     </Button>
    //   ),
    // },
    {
      title: "Diterima Produksi",
      key: "productionReceived",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const productionReceived =
          record.productionReceived ?? record.productionRecieved ?? false;
        return (
          <Checkbox
            checked={productionReceived}
            disabled={!isRowUnlocked(record)}
          />
        );
      },
    },
    {
      title: "Terpakai",
      key: "requestReceivedInput",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const sentValue = getRequestSentValue(record);
        const storedReceived = requestReceivedValues[record.id];
        const initialReceived =
          record.requestReceived !== null &&
          record.requestReceived !== undefined
            ? Number(record.requestReceived)
            : undefined;
        const displayValue =
          storedReceived !== undefined ? storedReceived : initialReceived;
        const isEditingRow = editingTerpakaiId === record.id;
        const isDone = record.is_done || record.isDone;
        const hasInvoice = Boolean(record.invoice_no);
        // Terpakai remains locked even when reopening; edits are restricted
        const allowEdit = false;
        return (
          <Input
            type="number"
            step="0.01"
            value={displayValue ?? ""}
            disabled={!allowEdit}
            onChange={(e) =>
              handleRequestReceivedChange(record.id, e.target.value, sentValue)
            }
            className={`w-full px-3 py-2 rounded-md text-sm ${
              !isEditingRow || isDone
                ? "cursor-not-allowed opacity-80"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
            style={{
              border: `1px solid #d9d9d9`,
              backgroundColor: !isEditingRow || isDone ? "#f5f5f5" : "#ffffff",
            }}
          />
        );
      },
    },
    {
      title: "Sisa Bahan",
      key: "requestLeft",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const sentValue = getRequestSentValue(record);
        const leftValue = getRequestLeftValue(record);
        return (
          <Input
            type="number"
            step="0.01"
            value={leftValue ?? ""}
            disabled={!isRowUnlocked(record)}
            onChange={(e) =>
              handleRequestLeftChange(record.id, e.target.value, sentValue)
            }
            style={{ width: "100%" }}
          />
        );
      },
    },
    {
      title: "Kembali Ke Gudang",
      dataIndex: "warehouseReturned",
      key: "warehouseReturned",
      ellipsis: true,
      width: 90,
      align: "center" as const,
      render: (value: boolean, record: RequestItem) => (
        <Checkbox
          checked={value}
          onChange={(e) => handleWarehouseReturn(record.id, e.target.checked)}
          disabled={!isRowUnlocked(record)}
          style={{ margin: 0 }}
        />
      ),
    },
    {
      title: "Status",
      key: "status",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        if (record.is_done || record.isDone) {
          return (
            <span style={{ color: "#52c41a", fontWeight: "bold" }}>Done</span>
          );
        }
        if (record.is_rejected || record.isRejected) {
          return (
            <span style={{ color: "#f5222d", fontWeight: "bold" }}>
              Rejected
            </span>
          );
        }
        if (record.productionReceived) {
          return <span style={{ color: "#52c41a" }}>Diterima produksi</span>;
        }
        if (record.requestSent) {
          const receivedValue = Number(record.requestReceived);
          if (!Number.isNaN(receivedValue) && receivedValue > 0) {
            return (
              <span style={{ color: "#1890ff" }}>
                Diterima {formatReceivedAmount(receivedValue)}{" "}
                {record.satuan || "satuan"}
              </span>
            );
          }
          return <span style={{ color: "#1890ff" }}>Dikirim ke produksi</span>;
        }
        return <span style={{ color: "#999999" }}>Belum dikirim</span>;
      },
    },
    {
      title: "Transaction ID",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      ellipsis: true,
      width: 160,
    },
    {
      title: "Accurate",
      key: "done_action",
      width: 100,
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const disabled = isDoneButtonDisabled(record);
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => handleMarkDone(record)}
            disabled={disabled}
            loading={markingDone === record.id}
            style={{ minWidth: "70px" }}
          >
            {record.is_done || record.isDone ? "Done" : "Send"}
          </Button>
        );
      },
    },
    {
      title: "Actions",
      key: "rowActions",
      ellipsis: true,
      width: "140",
      align: "center" as const,
      render: (_: unknown, record: RequestItem) => {
        const isEditing = editingTerpakaiId === record.id;
        const isDone = record.is_done || record.isDone;
        return (
          <Space size={4}>
            {!record.productionReceived && (
              <Tooltip title={isEditing ? "Editing" : "Edit"}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  disabled={!record.invoiceNo && !isRowUnlocked(record)}
                  onClick={() => {
                    if (!isRowUnlocked(record)) {
                      reopenRequestMutation.mutate(record.id);
                      return;
                    }
                    toggleTerpakaiEdit(record.id);
                  }}
                />
              </Tooltip>
            )}
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              loading={deletingRequestId === record.id}
              disabled={
                deletingRequestId !== null && deletingRequestId !== record.id
              }
              onClick={() => confirmDeleteRequest(record)}
            />
          </Space>
        );
      },
    },
  ];

  // Calculate active filters count
  const activeFiltersCount = [
    filterBelumDikirim,
    filterBelumDiterima,
    filterBelumDiotorisasi,
    filterBelumBeli,
  ].filter(Boolean).length;

  // Reset all filters function
  const resetFilters = () => {
    setFilterBelumDikirim(false);
    setFilterBelumDiterima(false);
    setFilterBelumDiotorisasi(false);
    setFilterBelumBeli(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <Modal
      title={
        <Space align="center">
          <Warehouse size={20} style={{ color: "#1890ff" }} />
          <span style={{ fontSize: "18px", fontWeight: 600 }}>Gudang</span>
          <Badge
            count={data?.pagination?.total || 0}
            style={{ backgroundColor: "#52c41a" }}
            overflowCount={999}
          />
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={1600}
      styles={{
        body: {
          padding: "24px",
          backgroundColor: "#fafafa",
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
            {activeFiltersCount > 0 && (
              <Badge
                count={activeFiltersCount}
                style={{ backgroundColor: "#faad14" }}
              />
            )}
          </Space>
        }
        extra={
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw size={14} />}
              onClick={() => refetch()}
              style={{
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
        <Space
          direction="horizontal"
          size="large"
          style={{ width: "100%", flexWrap: "wrap" }}
        >
          <Checkbox
            checked={filterBelumDikirim}
            onChange={(e) => {
              setFilterBelumDikirim(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumDikirim ? 600 : 400,
              color: filterBelumDikirim ? "#1890ff" : "#666",
            }}
          >
            📦 Belum Dikirim
          </Checkbox>
          <Checkbox
            checked={filterBelumDiterima}
            onChange={(e) => {
              setFilterBelumDiterima(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumDiterima ? 600 : 400,
              color: filterBelumDiterima ? "#1890ff" : "#666",
            }}
          >
            🟡 Belum Diterima
          </Checkbox>
          <Checkbox
            checked={filterBelumDiotorisasi}
            onChange={(e) => {
              setFilterBelumDiotorisasi(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumDiotorisasi ? 600 : 400,
              color: filterBelumDiotorisasi ? "#1890ff" : "#666",
            }}
          >
            ✅ Belum Diotorisasi
          </Checkbox>
          <Checkbox
            checked={filterBelumBeli}
            onChange={(e) => {
              setFilterBelumBeli(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            style={{
              fontSize: "14px",
              fontWeight: filterBelumBeli ? 600 : 400,
              color: filterBelumBeli ? "#1890ff" : "#666",
            }}
          >
            🧾 Belum Beli
          </Checkbox>
        </Space>
      </Card>
      <Card
        style={{
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid #e8e8e8",
        }}
      >
        <Table
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: "max-content" }}
          size="small"
          locale={{
            emptyText: (
              <div
                style={{ padding: "40px", textAlign: "center", color: "#999" }}
              >
                <Warehouse
                  size={48}
                  style={{ color: "#d9d9d9", marginBottom: "16px" }}
                />
                <div>Tidak ada data request</div>
              </div>
            ),
          }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: data?.pagination?.total || 0,
            onChange: (page, pageSize) =>
              setPagination({ ...pagination, page, limit: pageSize }),
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} requests`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          style={{
            backgroundColor: "white",
          }}
        />
      </Card>
    </Modal>
  );
};

export default ModalRequestSent;
