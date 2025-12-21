import {
  getAllRequests,
  markRequestDone,
  updateRequest,
  updateWarehouseReturn,
  deleteRequest,
  updateProductionReceived,
  printWarehouseBarcodes,
  printShippingBarcodes,
} from "@api/accurate";
import { useUpdateRequestFields } from "@hooks/accurate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  DatePicker,
  message,
  Modal,
  Select,
  Table,
  Tag,
  Card,
  Space,
  Tooltip,
  Modal as AntdModal,
} from "antd";
import type { InputRef } from "antd";
import type { AxiosError } from "axios";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatRequestQuantity } from "@utils/request-format";
import { Filter, RefreshCw, RotateCcw, Warehouse, Truck } from "lucide-react";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  ApiResponse,
  BeliStatus,
  DEFAULT_BELI_STATUS,
  RequestItem,
} from "@myTypes/request";
import { usePermissions } from "@hooks/account";
import UserSelectionForModal from "@components/UserSelectionForModal";

type BasicStatusFilter = "ALL" | "SUDAH" | "BELUM";
type BeliStatusFilter = "ALL" | "BELUM" | "YA" | "TIDAK";
type BarcodeType = "warehouse" | "shipping";

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

const getEstBahanValue = (record: RequestItem) =>
  record.estBahan ?? record.est_bahan;

const ModalRequestSent: React.FC<ModalRequestSentProps> = ({
  open,
  onClose,
}): JSX.Element => {
  const { isSuperAdmin } = usePermissions();
  const [requestSentValues, setRequestSentValues] = useState<
    Record<string, string>
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
  const [filterDikirim, setFilterDikirim] =
    useState<BasicStatusFilter>("ALL");
  const [filterDiterima, setFilterDiterima] =
    useState<BasicStatusFilter>("ALL");
  const [filterBeliStatus, setFilterBeliStatus] =
    useState<BeliStatusFilter>("ALL");
  const [filterKembali, setFilterKembali] =
    useState<BasicStatusFilter>("ALL");
  const [filterAccurate, setFilterAccurate] =
    useState<BasicStatusFilter>("ALL");
  const [isExporting, setIsExporting] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [shortIdFilter, setShortIdFilter] = useState<number | null>(null);
  const scanInputRef = useRef<InputRef | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [editingTerpakaiId, setEditingTerpakaiId] = useState<string | null>(
    null
  );
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null
  );
  const [reopenedIds, setReopenedIds] = useState<Set<string>>(new Set());
  const [sentByOverrides, setSentByOverrides] = useState<Record<string, string>>(
    {}
  );
  const [sentLockOverrides, setSentLockOverrides] = useState<
    Record<string, boolean>
  >({});
  const [receivedByOverrides, setReceivedByOverrides] = useState<
    Record<string, string>
  >({});
  const [productionReceivedOverrides, setProductionReceivedOverrides] =
    useState<Record<string, boolean>>({});
  const [warehouseReturnOverrides, setWarehouseReturnOverrides] = useState<
    Record<string, boolean>
  >({});
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [exportDraftRange, setExportDraftRange] = useState<
    [Dayjs | null, Dayjs | null]
  >([null, null]);
  const [isPrintingBarcode, setIsPrintingBarcode] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [scannedRequest, setScannedRequest] = useState<RequestItem | null>(null);
  const [sisaInput, setSisaInput] = useState<string>("");
  const [isSavingSisa, setIsSavingSisa] = useState(false);

  const queryClient = useQueryClient();
  const debouncedSearch = useRef(
    debounce((value: string) => {
      setSearchTerm(value.trim());
    }, 400)
  ).current;

  // Build filter object based on current filter states
  const filterParams = useMemo(() => {
    const baseFilter: Record<string, any> = {
      isRejected: false,
      isVerified: true,
    };
    if (shortIdFilter !== null) {
      baseFilter.shortId = shortIdFilter;
    }

    switch (filterAccurate) {
      case "SUDAH":
        baseFilter.isDone = true;
        break;
      case "BELUM":
        baseFilter.isDone = false;
        break;
    }

    switch (filterDikirim) {
      case "SUDAH":
        baseFilter.requestSentStatus = "SENT";
        break;
      case "BELUM":
        baseFilter.sentByEmpty = true;
        break;
    }

    switch (filterDiterima) {
      case "SUDAH":
        baseFilter.productionReceived = true;
        break;
      case "BELUM":
        baseFilter.productionReceived = false;
        break;
    }

    switch (filterBeliStatus) {
      case "BELUM":
        baseFilter.beliEmpty = true;
        break;
      case "YA":
        baseFilter.beli = "Ya";
        break;
      case "TIDAK":
        baseFilter.beli = "Tidak";
        break;
    }

    switch (filterKembali) {
      case "SUDAH":
        baseFilter.warehouseReturned = true;
        break;
      case "BELUM":
        baseFilter.warehouseReturned = false;
        break;
    }

    if (labelFilter) {
      baseFilter.labelName = labelFilter;
    }
    if (requestTypeFilter) {
      baseFilter.requestType = requestTypeFilter;
    }
    if (dateRange[0] || dateRange[1]) {
      baseFilter.requestReceived = {
        from: dateRange[0]?.startOf("day").toISOString(),
        to: dateRange[1]?.endOf("day").toISOString(),
      };
    }
    if (searchTerm) {
      baseFilter.search = searchTerm;
    }

    return baseFilter;
  }, [
    filterAccurate,
    filterDikirim,
    filterDiterima,
    filterBeliStatus,
    filterKembali,
    labelFilter,
    requestTypeFilter,
    dateRange,
    searchTerm,
    shortIdFilter,
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

  const [requestLeftValues, setRequestLeftValues] = useState<
    Record<string, string | number | undefined>
  >({});
  const formatRequestTypeLabel = (type: string) =>
    type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

  const labelOptions = useMemo(() => {
    const collected = new Set<string>();
    data?.data.forEach((item) => {
      (item.card_labels || []).forEach((label) =>
        collected.add(label.trim())
      );
    });
    const base = ["Ozzy", "Steady"];
    return Array.from(new Set([...base, ...Array.from(collected).sort()]));
  }, [data]);

  const dropdownStatusOptions: { label: string; value: BasicStatusFilter }[] = [
    { label: "Semua", value: "ALL" },
    { label: "Sudah", value: "SUDAH" },
    { label: "Belum", value: "BELUM" },
  ];

  const beliDropdownOptions: { label: string; value: BeliStatusFilter }[] = [
    { label: "Semua", value: "ALL" },
    { label: "Belum", value: "BELUM" },
    { label: "Ya", value: "YA" },
    { label: "Tidak", value: "TIDAK" },
  ];

  useEffect(() => {
    if (!data) return;

    const initialSentValues: Record<string, string> = {};
    const initialReceivedValues: Record<string, number> = {};
    const initialLeftValues: Record<string, number | undefined> = {};
    const initialBeliValues: Record<string, BeliSelection> = {};
    const initialReceivedByValues: Record<string, string> = {};
    const initialProductionReceived: Record<string, boolean> = {};
    const initialSentLocks: Record<string, boolean> = {};
    data.data.forEach((item) => {
      const numericSent = Number(item.requestSent);
      if (!Number.isNaN(numericSent)) {
        initialSentValues[item.id] = String(numericSent);
        initialSentLocks[item.id] = true; // lock if already has sent value
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
      const beliValue = (item.beli ?? "-") as BeliSelection;
      initialBeliValues[item.id] = beliValue;
      if (
        initialSentLocks[item.id] === undefined &&
        beliValue !== "-" &&
        beliValue !== ""
      ) {
        initialSentLocks[item.id] = false; // auto-open when beli is preset and no sent value
      }
      const resolvedReceivedBy =
        item.receivedBy ?? (item as any)?.received_by ?? null;
      if (resolvedReceivedBy) {
        initialReceivedByValues[item.id] = resolvedReceivedBy;
      }
      const resolvedProductionReceived = Boolean(
        item.productionReceived ?? item.productionRecieved
      );
      initialProductionReceived[item.id] = resolvedProductionReceived;
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
    setReceivedByOverrides((prev) => ({
      ...prev,
      ...initialReceivedByValues,
    }));
    setProductionReceivedOverrides((prev) => ({
      ...prev,
      ...initialProductionReceived,
    }));
    setSentLockOverrides((prev) => ({
      ...initialSentLocks,
      ...prev,
    }));
    setPagination((prev) => ({
      ...prev,
      total: data.pagination?.total || 0,
    }));
  }, [data]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scanInputRef.current?.focus?.();
      }, 50);
    }
  }, [open]);

  useEffect(() => {
    if (shortIdFilter !== null) {
      findAndOpenScannedRequest(shortIdFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, shortIdFilter]);

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

  const { mutate: updateProductionReceivedStatus } = useMutation({
    mutationFn: ({
      id,
      productionReceived,
    }: {
      id: string;
      productionReceived: boolean;
    }) => updateProductionReceived(id, productionReceived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: () => {
      message.error("Failed to update received status");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => deleteRequest(id),
    onSuccess: () => {
      message.success("Request deleted");
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

  const saveSisaMutation = useMutation({
    mutationFn: ({ id, sisa }: { id: string; sisa: number }) =>
      updateRequest(id, { requestLeft: sisa, warehouseReturned: true }),
    onSuccess: async (_, { id }) => {
      message.success("Sisa Bahan berhasil disimpan");
      setScannedRequest(null);
      setSisaInput("");
      setShortIdFilter(null);
      setWarehouseReturnOverrides((prev) => ({ ...prev, [id]: true }));
      await refetch();
    },
    onError: (error: any) => {
      const reason = extractApiErrorReason(error);
      message.error(reason || "Gagal menyimpan Sisa Bahan");
    },
    onSettled: () => setIsSavingSisa(false),
  });

  const [markingDone, setMarkingDone] = useState<string | null>(null);

  const requestReceivedDebounceMap = useRef<
    Record<string, (payload: { amount: number; left: number }) => void>
  >({});

  const parseLocalizedNumberInput = (rawValue: string): number => {
    const normalized =
      typeof rawValue === "string" ? rawValue.replace(/,/g, ".") : rawValue;
    if (normalized === "") return 0;
    const numericValue = Number(normalized);
    return Number.isNaN(numericValue) ? 0 : numericValue;
  };

  const attemptSendRequest = (
    id: string,
    record?: RequestItem
  ): boolean => {
    const rawInput =
      requestSentValues[id] ??
      (record?.requestSent !== undefined && record?.requestSent !== null
        ? String(record.requestSent)
        : "");
    const amount = parseLocalizedNumberInput(rawInput);

    sendRequest({ id, amount });
    return true;
  };

  const handleSendRequest = (id: string, record?: RequestItem): void => {
    attemptSendRequest(id, record);
  };

  const handleBeliChange = (id: string, value: BeliSelection) => {
    setBeliValues((prev) => ({
      ...prev,
      [id]: value,
    }));
    if (value === "-") {
      setSentLockOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setSentLockOverrides((prev) => ({
      ...prev,
      [id]: false, // auto-open jumlah dikirim when beli is selected
    }));
    updateBeliStatus({ id, beli: value });
  };

  const handleWarehouseReturn = (id: string, checked: boolean) => {
    setWarehouseReturnOverrides((prev) => ({
      ...prev,
      [id]: checked,
    }));
    updateWarehouseReturnStatus({ id, returned: checked });
  };
  const handleProductionReceivedChange = (id: string, checked: boolean) => {
    setProductionReceivedOverrides((prev) => ({
      ...prev,
      [id]: checked,
    }));
    updateProductionReceivedStatus({
      id,
      productionReceived: checked,
    });
  };
  const handlePrintBarcode = async () => {
    setIsPrintingBarcode(true);
    try {
      const response = await printWarehouseBarcodes();
      const items =
        (Array.isArray(response?.items) && response.items) ||
        (Array.isArray(response?.data?.items) && response.data.items) ||
        [];
      const printedCount = items.length;
      const payloadData = response?.data ?? {};
      const downloadUrl =
        payloadData.download_url ||
        payloadData.downloadUrl ||
        payloadData?.data?.download_url ||
        payloadData?.data?.downloadUrl ||
        response?.download_url ||
        response?.downloadUrl;
      if (printedCount > 0) {
        message.success(`Barcode print triggered for ${printedCount} item${printedCount === 1 ? "" : "s"}.`);
        if (downloadUrl) {
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
        }
        await refetch();
        setLastRefreshedAt(new Date());
      } else {
        message.info("Tidak ada request yang perlu dicetak barcode.");
      }
    } catch (error: any) {
      const reason = extractApiErrorReason(error);
      message.error(reason || "Gagal memicu cetak barcode");
    } finally {
      setIsPrintingBarcode(false);
    }
  };
  const handleBarcodeModalClose = () => {
    if (!isPrintingBarcode) {
      setBarcodeModalOpen(false);
    }
  };

  const handleBarcodeTypeSelect = async (type: BarcodeType) => {
    if (type === "warehouse") {
      setBarcodeModalOpen(false);
      await handlePrintBarcode();
      return;
    }
    setIsPrintingBarcode(true);
    setBarcodeModalOpen(false);
    try {
      const response = await printShippingBarcodes();
      const blob: Blob = response?.data;
      const contentType =
        response?.headers?.["content-type"] || blob?.type || "";

      if (contentType.includes("application/json") && blob) {
        const text = await blob.text();
        const payload = (() => {
          try {
            return JSON.parse(text);
          } catch {
            return {};
          }
        })();
        const msg =
          payload?.message ||
          "Tidak ada barcode pengiriman yang perlu dicetak.";
        message.info(msg);
        return;
      }

      if (blob) {
        const url = URL.createObjectURL(
          new Blob([blob], { type: contentType || "application/pdf" })
        );
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        message.success("Barcode pengiriman siap diunduh.");
      } else {
        message.info("Tidak ada barcode pengiriman yang perlu dicetak.");
      }
    } catch (error: any) {
      const reason = extractApiErrorReason(error);
      message.error(reason || "Gagal mencetak barcode pengiriman");
    } finally {
      setIsPrintingBarcode(false);
    }
  };

  const findAndOpenScannedRequest = (
    shortId: number,
    suppressWarning?: boolean
  ) => {
    const items = data?.data || [];
    const match = items.find((item: any) => {
      const candidate =
        item.short_id ?? item.shortId ?? item.id ?? item.request_id;
      const parsed = Number(candidate);
      return Number.isFinite(parsed) && parsed === Number(shortId);
    });
    if (!match) {
      if (!suppressWarning) {
        message.warning("Request dengan Short ID tersebut tidak ditemukan.");
      }
      return;
    }
    setShortIdFilter(shortId);
    setScannedRequest(match);
    const initialSisa =
      match.request_left ??
      (match as any)?.requestLeft ??
      (match as any)?.request_left ??
      "";
    const numericInitial =
      initialSisa !== null && initialSisa !== undefined
        ? Number(initialSisa)
        : null;
    const shouldBlank =
      numericInitial !== null &&
      Number.isFinite(numericInitial) &&
      numericInitial === 0;
    const formatted =
      numericInitial !== null && Number.isFinite(numericInitial)
        ? numericInitial.toFixed(2).replace(/\.?0+$/, (m) =>
          m === "." ? "" : m
        )
        : "";
    setSisaInput(
      shouldBlank
        ? ""
        : initialSisa !== null && initialSisa !== undefined
          ? formatted || String(initialSisa)
          : ""
    );
  };

  const sisaModalOpen = Boolean(scannedRequest);

  const handleSaveSisa = () => {
    if (!scannedRequest) return;
    const numeric = Number(sisaInput);
    if (Number.isNaN(numeric)) {
      message.warning("Masukkan angka untuk Sisa Bahan");
      return;
    }
    setIsSavingSisa(true);
    saveSisaMutation.mutate({ id: scannedRequest.id, sisa: numeric });
  };
  const handleExport = async () => {
    setExportModalOpen(true);
  };

  const buildExportFilter = (range: [Dayjs | null, Dayjs | null]) => {
    const base = { ...filterParams };
    if (range[0] || range[1]) {
      base.requestReceived = {
        from: range[0]?.startOf("day").toISOString(),
        to: range[1]?.endOf("day").toISOString(),
      };
    }
    return base;
  };

  const fetchAllForExport = async (
    range: [Dayjs | null, Dayjs | null]
  ): Promise<RequestItem[]> => {
    const limit = 1000;
    let page = 1;
    const all: RequestItem[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resp = await getAllRequests(
        page,
        limit,
        buildExportFilter(range)
      );
      const chunk: RequestItem[] = resp?.data ?? [];
      all.push(...chunk);
      const total = resp?.pagination?.total ?? chunk.length;
      if (all.length >= total || chunk.length < limit) {
        break;
      }
      page += 1;
    }
    return all;
  };

  const downloadCsv = (records: RequestItem[]) => {
    const csvEscape = (raw: string | number | boolean | null | undefined) => {
      const value = raw ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    };

    const header = [
      "Tanggal",
      "Nama PO",
      "Type",
      "Labels",
      "Cabang",
      "Item",
      "Request",
      "Satuan",
      "Est Bahan",
      "Efisiensi",
      "Deskripsi",
      "Verified",
      "Beli",
      "Jumlah Dikirim",
      "Dikirim Oleh",
      "Diterima Oleh",
      "Diterima Produksi",
      "Sisa Bahan",
      "Terpakai",
      "Kembali Ke Gudang",
      "Status",
      "Transaction ID",
    ];

    const rows = records.map((record) => {
      const createdAt = record.createdAt
        ? dayjs(record.createdAt).format("YYYY-MM-DD HH:mm")
        : "-";
      const labels = (() => {
        const raw =
          record.card_labels ||
          record.cardLabels ||
          [];
        const normalized = raw.map((l) => String(l).toLowerCase());
        const parts: string[] = [];
        if (normalized.some((l) => l === "ozzy")) parts.push("Ozzy");
        if (normalized.some((l) => l === "steady")) parts.push("Steady");
        return parts.join("; ");
      })();
      const cabangValue = getCabangValue(record);
      const requestAmount = formatRequestQuantity(record.requestAmount);
      const estBahan = formatRequestQuantity(getEstBahanValue(record));
      const efisiensi = formatRequestQuantity(record.efisiensi);
      const verified = record.isVerified ? "Verified" : "Pending";
      const beliValue =
        (record.beli as BeliSelection) ??
        DEFAULT_BELI_STATUS ??
        "-";
      const jumlahDikirimValue =
        getResolvedRequestSent(record) ?? "";
      const sentByName =
        record.sentByName ||
        record.sentBy ||
        sentByOverrides[record.id] ||
        "";
      const receivedByName =
        record.receivedByName ||
        record.receivedBy ||
        receivedByOverrides[record.id] ||
        (record as any)?.received_by ||
        "";
      const diterimaProduksi = record.productionReceived
        ? "Ya"
        : "Tidak";
      const sisaBahan = getRequestLeftValue(record) ?? "";
      const terpakai = getResolvedRequestReceived(record) ?? "";
      const kembaliGudang = record.warehouseReturned ? "Ya" : "Tidak";
      const status = (() => {
        if (record.is_done || record.isDone) return "Done";
        if (record.is_rejected || record.isRejected) return "Rejected";
        if (record.productionReceived) return "Diterima produksi";
        if (record.requestSent) return "Dikirim";
        return "Belum dikirim";
      })();
      const transactionId = record.invoiceNo || record.invoice_no || "";

      return [
        csvEscape(createdAt),
        csvEscape(record.cardName || ""),
        csvEscape(record.requestType || ""),
        csvEscape(labels),
        csvEscape(cabangValue),
        csvEscape(record.itemName || ""),
        csvEscape(requestAmount),
        csvEscape(record.satuan || ""),
        csvEscape(estBahan),
        csvEscape(efisiensi),
        csvEscape(record.description || ""),
        csvEscape(verified),
        csvEscape(beliValue),
        csvEscape(jumlahDikirimValue),
        csvEscape(sentByName),
        csvEscape(receivedByName),
        csvEscape(diterimaProduksi),
        csvEscape(sisaBahan),
        csvEscape(terpakai),
        csvEscape(kembaliGudang),
        csvEscape(status),
        csvEscape(transactionId),
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gudang-requests-${dayjs().format(
      "YYYYMMDD-HHmmss"
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmExport = async () => {
    if (!exportRange[0] || !exportRange[1]) {
      message.warning("Pilih rentang tanggal terlebih dahulu");
      return;
    }
    const diffDays = exportRange[1].diff(exportRange[0], "day");
    if (diffDays > 30) {
      message.error("Rentang maksimum 31 hari (31 hari inklusif)");
      return;
    }

    setIsExporting(true);
    try {
      const records = await fetchAllForExport(exportRange);
      if (!records.length) {
        message.info("Tidak ada data pada rentang tersebut");
        return;
      }
      downloadCsv(records);
      setExportModalOpen(false);
    } catch (error) {
      message.error("Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const disableExportDate = (current: Dayjs) => {
    const todayEnd = dayjs().endOf("day");
    if (current.isAfter(todayEnd)) {
      return true; // block future dates
    }

    const [start, end] =
      exportDraftRange[0] || exportDraftRange[1] ? exportDraftRange : exportRange;

    const anchor = start || end;
    if (!anchor) return false;

    const diffFromAnchor = Math.abs(
      current.startOf("day").diff(anchor.startOf("day"), "day")
    );
    if (diffFromAnchor > 30) {
      return true; // outside 31-day window from the selected date
    }

    if (start && end) {
      const minDate = start.isBefore(end) ? start : end;
      const maxDate = start.isAfter(end) ? start : end;
      const rangeDiff = maxDate.diff(minDate, "day");
      if (rangeDiff > 30) return true;
    }

    return false;
  };

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
    ? dayjs(lastRefreshedAt).format("DD MMM YYYY HH:mm:ss")
    : "Belum pernah";
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
    const normalizedValue = parseLocalizedNumberInput(rawValue);
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
    if (stored !== undefined) {
      return parseLocalizedNumberInput(stored);
    }
    const numericSent = Number(record.requestSent ?? 0);
    return Number.isNaN(numericSent) ? 0 : numericSent;
  };

  const getRequestLeftValue = (
    record: RequestItem
  ): string | number | undefined => {
    const stored = requestLeftValues[record.id];
    if (stored !== undefined) {
      return stored;
    }
    const leftFromRecord = record.requestLeft ?? record.request_left ?? undefined;
    return leftFromRecord as string | number | undefined;
  };

  const parseNumericValue = (
    value: number | string | null | undefined
  ): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const normalized =
      typeof value === "string" ? value.replace(/,/g, ".") : value;
    const numeric = Number(normalized);
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

  const getWarehouseReturnedValue = (record: RequestItem): boolean =>
    warehouseReturnOverrides[record.id] ?? Boolean(record.warehouseReturned);

  const getBarcodePrintedValue = (record: RequestItem): boolean =>
    Boolean(
      (record as any)?.barcode_printed ??
      (record as any)?.barcodePrinted ??
      false
    );

  const getBeliSelection = (record: RequestItem): BeliSelection => {
    const storedValue = beliValues[record.id];
    if (storedValue !== undefined) return storedValue;
    return (record.beli as BeliSelection) ?? "-";
  };

  const isJumlahDikirimLocked = (record: RequestItem): boolean => {
    const override = sentLockOverrides[record.id];
    if (override !== undefined) return override;
    if (record.requestSent !== null && record.requestSent !== undefined) {
      return true;
    }
    return false;
  };

  const getWorkflowState = (record: RequestItem) => {
    const cabangFilled = Boolean(getCabangValue(record));
    const isPersediaanProduct =
      (record?.type || "").toLowerCase() === "persediaan";
    const beliSelection = isPersediaanProduct
      ? DEFAULT_BELI_STATUS
      : getBeliSelection(record);
    const beliSelected = Boolean(beliSelection && beliSelection !== "-");
    const resolvedSent = getResolvedRequestSent(record);
    const sentAmount = resolvedSent ?? 0;
    const hasJumlahDikirim = resolvedSent !== undefined;
    const sentMoreThanZero = sentAmount > 0;
    const sentByValue =
      sentByOverrides[record.id] ??
      record.sentBy ??
      (record as any)?.sent_by;
    const hasSentBy = Boolean(sentByValue);
    const receivedByValue =
      receivedByOverrides[record.id] ??
      record.receivedBy ??
      (record as any)?.received_by;
    const hasReceivedBy = Boolean(receivedByValue);
    const productionReceived =
      productionReceivedOverrides[record.id] ??
      record.productionReceived ??
      record.productionRecieved ??
      false;
    const warehouseReturned = getWarehouseReturnedValue(record);
    const jumlahLocked = isJumlahDikirimLocked(record);

    return {
      cabangFilled,
      beliSelection,
      beliSelected,
      hasJumlahDikirim,
      sentMoreThanZero,
      hasSentBy,
      hasReceivedBy,
      productionReceived,
      warehouseReturned,
      jumlahLocked,
    };
  };

  const getMissingDoneFields = (record: RequestItem): string[] => {
    const missing: string[] = [];
    if (getResolvedRequestSent(record) === undefined) {
      missing.push("Jumlah Dikirim");
    }
    if (getResolvedRequestReceived(record) === undefined) {
      missing.push("Terpakai");
    }
    // if (getResolvedRequestLeft(record) === undefined) {
    //   missing.push("Sisa Bahan");
    // }
    if (!getWarehouseReturnedValue(record)) {
      missing.push("Kembali ke Gudang");
    }
    if (!getCabangValue(record)) {
      missing.push("Cabang");
    }
    const barcodeRequired =
      getWarehouseReturnedValue(record) ||
      Boolean(
        productionReceivedOverrides[record.id] ??
        record.productionReceived ??
        record.productionRecieved
      );
    if (barcodeRequired && !getBarcodePrintedValue(record)) {
      missing.push("Cetak Barcode");
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
    const workflow = getWorkflowState(record);
    if (
      !workflow.warehouseReturned
    ) {
      return true;
    }
    return !isReadyForDone(record);
  };

  const handleRequestLeftChange = (
    id: string,
    rawValue: string,
    sentValue: number
  ) => {
    const normalizedValue = parseLocalizedNumberInput(rawValue);
    const sanitizedSent = Number.isNaN(sentValue) ? 0 : sentValue;
    const calculatedReceived = Math.max(sanitizedSent - normalizedValue, 0);

    setRequestLeftValues((prev) => ({
      ...prev,
      [id]: rawValue,
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

  const handleRequestSentChange = (id: string, rawValue: string) => {
    setRequestSentValues((prev) => ({
      ...prev,
      [id]: rawValue,
    }));
  };


  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
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

  const handleScanSubmit = (value?: string) => {
    const raw = (value ?? scanInput).trim();
    const numeric = Number(raw);
    if (!raw) {
      setShortIdFilter(null);
      return;
    }
    if (Number.isNaN(numeric)) {
      message.warning("Short ID tidak valid");
      return;
    }
    setShortIdFilter(numeric);
    setScanInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
    findAndOpenScannedRequest(numeric, true);
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
      title: "Nama PO",
      dataIndex: "cardName",
      key: "card_name",
      ellipsis: true,
      width: 200,
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
      title: "Ozzy / Steady",
      key: "card_labels",
      ellipsis: true,
      width: 120,
      render: (_: unknown, record: RequestItem) => {
        const labels = record.card_labels || record.cardLabels || [];
        console.log(labels, '<< in i isi lables')
        const hasOzzy = labels.some((l) => l.toLowerCase() === "ozzy");
        const hasSteady = labels.some((l) => l.toLowerCase() === "steady");
        if (!hasOzzy && !hasSteady) return <Tag color="default">-</Tag>;
        return (
          <Space size={4}>
            {hasOzzy && <Tag color="navy">Ozzy</Tag>}
            {hasSteady && <Tag color="red">Steady</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Cabang",
      key: "cabang",
      ellipsis: true,
      width: 140,
      render: (_: unknown, record: RequestItem) => {
        const cabangValue = getCabangValue(record);
        return cabangValue ? (
          <Tag color="purple">{cabangValue}</Tag>
        ) : (
          <Tag color="default">Belum diisi</Tag>
        );
      },
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
      title: "Beli",
      key: "beli",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const workflow = getWorkflowState(record);
        const isPersediaanProduct =
          (record?.type || "").toLowerCase() === "persediaan";
        const disabled = !isRowUnlocked(record) || !workflow.cabangFilled;
        return (
          <Select
            value={
              isPersediaanProduct
                ? DEFAULT_BELI_STATUS
                : (workflow.beliSelection as BeliSelection)
            }
            options={[
              { value: "-", label: "-" },
              { value: "Ya", label: "Ya" },
              { value: "Tidak", label: "Tidak" },
            ]}
            onChange={(value) =>
              handleBeliChange(record.id, value as BeliSelection)
            }
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );
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
          {(() => {
            const workflow = getWorkflowState(record);
            const canEdit =
              isRowUnlocked(record) &&
              workflow.cabangFilled &&
              workflow.beliSelected;
            const isLocked = workflow.jumlahLocked;
            const disableInput = !canEdit || isLocked;
            return (
              <>
                <Input
                  type="text"
                  step="0.01"
                  value={
                    requestSentValues[record.id] !== undefined
                      ? requestSentValues[record.id]
                      : record.requestSent !== null &&
                        record.requestSent !== undefined
                        ? Number(record.requestSent)
                        : ""
                  }
                  disabled={disableInput}
                  className={`flex-1 ${disableInput
                    ? "bg-gray-100 text-gray-500"
                    : ""
                    }`}
                  style={{ width: "100%" }}
                  onChange={(event) =>
                    handleRequestSentChange(record.id, event.target.value)
                  }
                />

                {!record.barcodePrinted && <Tooltip
                  title={
                    isLocked ? "Buka edit jumlah" : "Kunci jumlah"
                  }
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    disabled={!canEdit}
                    onClick={() => {
                      if (!canEdit) return;
                      if (isLocked) {
                        setSentLockOverrides((prev) => ({
                          ...prev,
                          [record.id]: false,
                        }));
                        return;
                      }
                      if (!attemptSendRequest(record.id, record)) {
                        return;
                      }
                      setSentLockOverrides((prev) => ({
                        ...prev,
                        [record.id]: true,
                      }));
                    }}
                    className="text-gray-500 hover:text-blue-600"
                  />
                </Tooltip>}
              </>
            );
          })()}
        </div>
      ),
    },
    {
      title: "Dikirim Oleh",
      dataIndex: "sentBy",
      key: "sentBy",
      ellipsis: true,
      width: "auto",
      render: (value: string, record: RequestItem) => {
        const workflow = getWorkflowState(record);
        const disabled =
          !isRowUnlocked(record) ||
          !workflow.cabangFilled ||
          !workflow.beliSelected ||
          !workflow.jumlahLocked ||
          !workflow.hasJumlahDikirim;
        return (
          <UserSelectionForModal
            value={value}
            placeholder="Pilih pengirim"
            disabled={disabled}
            onChange={(selectedUserId: string) => {
              setSentByOverrides((prev) => ({
                ...prev,
                [record.id]: selectedUserId,
              }));
              updateRequestFields({
                id: record.id,
                updates: { sent_by: selectedUserId },
              });
            }}
          />
        );
      },
    },
    {
      title: "Diterima Oleh",
      dataIndex: "receivedBy",
      key: "receivedBy",
      ellipsis: true,
      width: "auto",
      render: (_: string, record: RequestItem) => {
        const selectedValue =
          receivedByOverrides[record.id] ??
          record.receivedBy ??
          (record as any)?.received_by;
        return (
          <UserSelectionForModal
            value={selectedValue}
            placeholder="Pilih penerima"
            disabled
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
      title: "Diterima",
      key: "productionReceived",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const workflow = getWorkflowState(record);
        return (
          <Checkbox
            checked={workflow.productionReceived}
            onChange={(e) =>
              handleProductionReceivedChange(record.id, e.target.checked)
            }
            disabled
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
            type="text"
            step="0.01"
            value={displayValue ?? ""}
            disabled={!allowEdit}
            onChange={(e) =>
              handleRequestReceivedChange(record.id, e.target.value, sentValue)
            }
            className={`w-full px-3 py-2 rounded-md text-sm ${!isEditingRow || isDone
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
      title: "Est Bahan",
      key: "est_bahan",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        const estBahan = getEstBahanValue(record);
        if (estBahan === undefined || estBahan === null) {
          return <span>-</span>;
        }
        return (
          <span>
            {formatRequestQuantity(estBahan)} {record.satuan || ""}
          </span>
        );
      },
    },
    {
      title: "Efisiensi",
      key: "efisiensi",
      ellipsis: true,
      width: "auto",
      render: (_: unknown, record: RequestItem) => {
        if (record.efisiensi === undefined || record.efisiensi === null) {
          return <span>-</span>;
        }
        return (
          <span>
            {formatRequestQuantity(record.efisiensi)}
            {record.satuan ? ` ${record.satuan}` : ""}
          </span>
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
        const workflow = getWorkflowState(record);
        const disabled =
          !isRowUnlocked(record) || workflow.warehouseReturned;
        return (
          <Input
            type="text"
            step="0.01"
            value={leftValue ?? ""}
            disabled={disabled}
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
      render: (value: boolean, record: RequestItem) => {
        const workflow = getWorkflowState(record);
        const leftValue = getRequestLeftValue(record);
        const hasSisaBahanFilled =
          leftValue !== undefined && String(leftValue).trim() !== "";
        const disabled =
          !isRowUnlocked(record) ||
          !workflow.productionReceived ||
          !hasSisaBahanFilled;
        return (
          <Checkbox
            checked={workflow.warehouseReturned}
            onChange={(e) =>
              handleWarehouseReturn(record.id, e.target.checked)
            }
            disabled={disabled}
            style={{ margin: 0 }}
          />
        );
      },
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
        const disabled =
          record.warehouseReturned == null ||
          record.isDone === true ||
          record.barcodePrinted !== true;
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
            {isSuperAdmin() && (
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
            )}
          </Space>
        );
      },
    },
  ];

  // Calculate active filters count
  const activeFiltersCount = [
    filterDikirim !== "ALL",
    filterDiterima !== "ALL",
    filterBeliStatus !== "ALL",
    filterKembali !== "ALL",
    filterAccurate !== "ALL",
    Boolean(labelFilter),
    Boolean(requestTypeFilter),
    Boolean(searchTerm),
    shortIdFilter !== null,
  ].filter(Boolean).length;
  const activeDateFilter = Boolean(dateRange[0] || dateRange[1]);
  const totalActiveFilters = activeFiltersCount + (activeDateFilter ? 1 : 0);

  // Reset all filters function
  const resetFilters = () => {
    setFilterDikirim("ALL");
    setFilterDiterima("ALL");
    setFilterBeliStatus("ALL");
    setFilterKembali("ALL");
    setFilterAccurate("ALL");
    setLabelFilter("");
    setRequestTypeFilter("");
    setSearchInput("");
    setSearchTerm("");
    setScanInput("");
    setShortIdFilter(null);
    setDateRange([null, null]);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setScannedRequest(null);
    setSisaInput("");
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
              placeholder="Scan Short ID"
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
              style={{ width: 160 }}
            />
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              loading={isExporting}
              onClick={handleExport}
              style={{
                fontSize: "12px",
                height: "24px",
                padding: "0 10px",
              }}
            >
              Export
            </Button>
            <Button
              size="small"
              onClick={() => setBarcodeModalOpen(true)}
              loading={isPrintingBarcode}
              style={{
                fontSize: "12px",
                height: "24px",
                padding: "0 10px",
              }}
            >
              Cetak Barcode
            </Button>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
              placeholder="Search"
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
              value={filterDikirim}
              onChange={(value) => {
                setFilterDikirim(value as BasicStatusFilter);
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
              value={filterDiterima}
              onChange={(value) => {
                setFilterDiterima(value as BasicStatusFilter);
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
              Beli
            </span>
            <Select
              value={filterBeliStatus}
              onChange={(value) => {
                setFilterBeliStatus(value as BeliStatusFilter);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={beliDropdownOptions}
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
              Kembali
            </span>
            <Select
              value={filterKembali}
              onChange={(value) => {
                setFilterKembali(value as BasicStatusFilter);
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
              Accurate
            </span>
            <Select
              value={filterAccurate}
              onChange={(value) => {
                setFilterAccurate(value as BasicStatusFilter);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              options={dropdownStatusOptions}
            />
          </div>
        </div>
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
      <AntdModal
        open={Boolean(scannedRequest)}
        onCancel={() => {
          setScannedRequest(null);
          setSisaInput("");
          setShortIdFilter(null);
        }}
        onOk={handleSaveSisa}
        styles={{
          body: {
            padding: "1rem"
          }
        }}
        okText="Simpan"
        confirmLoading={isSavingSisa}
        title="Update Sisa Bahan"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600 }}>
            {scannedRequest?.itemName}
          </div>
          <div style={{ color: "#666" }}>
            {scannedRequest?.cardName ||
              (scannedRequest as any)?.card_name ||
              "-"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Sisa Bahan</span>
            <Input
              placeholder="Masukkan sisa bahan"
              value={sisaInput}
              onChange={(e) => setSisaInput(e.target.value)}
            />
          </div>
        </div>
      </AntdModal>
      <Modal
        open={barcodeModalOpen}
        onCancel={handleBarcodeModalClose}
        footer={null}
        styles={{
          body: {
            padding: '1rem'
          }
        }}
        title="Pilih jenis barcode"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 13, color: "#555" }}>
            Pilih jenis barcode yang ingin dicetak untuk permintaan gudang.
          </span>
          <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            <Button
              block
              size="large"
              icon={<Truck size={18} />}
              onClick={() => handleBarcodeTypeSelect("shipping")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                textAlign: "left",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600 }}>Barcode Pengiriman</div>
              </div>
            </Button>
            <Button
              type="primary"
              block
              size="large"
              icon={<Warehouse size={18} />}
              onClick={() => handleBarcodeTypeSelect("warehouse")}
              loading={isPrintingBarcode}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 10,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 600 }}>Sisa Bahan</div>
              </div>
            </Button>

          </div>
        </div>
      </Modal>
      <Modal
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        onOk={handleConfirmExport}
        confirmLoading={isExporting}
        title="Export Gudang Requests"
        okText="Export"
        cancelText="Batal"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#555" }}>
            Pilih rentang tanggal (maksimum 31 hari):
          </span>
          <DatePicker.RangePicker
            value={exportRange}
            onChange={(dates) => setExportRange([dates?.[0] ?? null, dates?.[1] ?? null])}
            onCalendarChange={(dates) =>
              setExportDraftRange([dates?.[0] ?? null, dates?.[1] ?? null])
            }
            allowEmpty={[true, true]}
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            disabledDate={disableExportDate}
          />
          <span style={{ fontSize: 12, color: "#888" }}>
            Export akan mengambil seluruh data dalam rentang tanpa pagination.
          </span>
        </div>
      </Modal>
    </Modal>
  );
};

export default ModalRequestSent;
