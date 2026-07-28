import {
  Button,
  Dropdown,
  MenuProps,
  Tooltip,
  Typography,
  message,
  Popover,
  Input,
  Space,
  Tag,
  Modal,
} from "antd";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useWorkspaceSidebar } from "@providers/workspace-sidebar-context";
import MembersList from "@components/members-list";
import {
  Ellipsis,
  ListFilter,
  Menu,
  SlidersHorizontal,
  Star,
  UserPlus,
  Users,
  QrCode,
  FileText,
  ArrowRight,
  Package,
  ShoppingCart,
  Truck,
  Camera,
  ScanLine,
  Link2,
} from "lucide-react";
import ModalStokQR from "@components/modal-stok-qr";
import ModalPOQR from "@components/modal-po-qr";
import ModalPOScan from "@components/modal-po-scan";
import ModalPacking from "@components/modal-packing";
import ModalPackingKirim from "@components/modal-packing-kirim";
import ModalPackingPOScan from "@components/modal-packing-po-scan";
import ModalPengiriman from "@components/modal-pengiriman";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "@api/index";
import { useWebSocket } from "@hooks/websocket";
import { useMoveOldCards } from "@hooks/card";
import { useUserBoardOrder } from "@hooks/user-board-order";
import { selectUser } from "@store/app_slice";
import { useParams } from "next/navigation";
import { FineGrainedPermissions } from "../../../../../types/board";
import ModalDelivery from "@components/modal-delivery";
import ScanProgressModal from "@components/scan-progress-modal";
import QRGuideOverlay from "@components/qr-overlay";
import { useLabels } from "@hooks/label";
import { Checkbox } from "antd";
import { createCustomOrderInvitation } from "@api/custom-order";

const sanitizeQueryParamId = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split("?")[0]?.split("&")[0]?.trim() || "";
};

// Helper function to derive permission level from fine-grained permissions
const getPermissionLevelFromFineGrained = (
  permissions: FineGrainedPermissions | null,
): string => {
  if (!permissions) return "OBSERVER";

  const { board, list, card } = permissions;

  // Admin: Can delete board
  if (board.delete) return "ADMIN";

  // Moderator: Can update board but not delete
  if (board.update) return "MODERATOR";

  // Member: Can create/update/delete lists and cards
  if (
    list.create &&
    list.update &&
    list.delete &&
    card.create &&
    card.update &&
    card.delete
  ) {
    return "MEMBER";
  }

  // Observer: Limited permissions
  return "OBSERVER";
};

interface BoardTopbarProps {
  boardScopeMenuOpen: boolean;
  setBoardScopeMenuOpen: any;
  openDashcardModal: boolean;
  setOpenDashcardModal: Dispatch<SetStateAction<boolean>>;
  board?: any; // Board data from API response
  selectedLabelIds?: string[];
  onLabelFilterChange?: (labelIds: string[]) => void;
}

const BoardTopbar: React.FC<BoardTopbarProps> = (props) => {
  const {
    boardScopeMenuOpen,
    setBoardScopeMenuOpen,
    openDashcardModal,
    setOpenDashcardModal,
    selectedLabelIds = [],
    onLabelFilterChange,
  } = props;
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const [showRightColMenu, setIsShowRighColtMenu] = useState(true);
  const [openRightMenu, setOpenRightMenu] = useState(false);
  const reduxBoard = useSelector(selectCurrentBoard);
  const currentBoard = props.board || reduxBoard;
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannerContext, setScannerContext] = useState<
    | "general"
    | "cetak-qr-stok"
    | "cetak-qr-po"
    | "packing-stok"
    | "packing-po"
    | "delivery-stok"
    | "delivery-po"
  >("general");
  const [showInvoiceInput, setShowInvoiceInput] = useState<boolean>(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);
  const [modalDeliveryOpen, setModalDeliveryOpen] = useState<boolean>(false);
  const [modalStokQROpen, setModalStokQROpen] = useState<boolean>(false);
  const [modalPOQROpen, setModalPOQROpen] = useState<boolean>(false);
  const [modalPOScanOpen, setModalPOScanOpen] = useState<boolean>(false);
  const [modalPackingOpen, setModalPackingOpen] = useState<boolean>(false);
  const [modalPackingKirimOpen, setModalPackingKirimOpen] =
    useState<boolean>(false);
  const [modalPackingPOScanOpen, setModalPackingPOScanOpen] =
    useState<boolean>(false);
  const [modalPengirimanOpen, setModalPengirimanOpen] =
    useState<boolean>(false);
  // Standalone Scan Progress modal state
  const [scanProgressOpen, setScanProgressOpen] = useState<boolean>(false);
  const [scanProgressCardId, setScanProgressCardId] = useState<string | null>(
    null,
  );
  // Label filter state
  const [labelFilterOpen, setLabelFilterOpen] = useState<boolean>(false);
  const [labelSearchQuery, setLabelSearchQuery] = useState<string>("");
  const [labelFilterModalOpen, setLabelFilterModalOpen] =
    useState<boolean>(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState<boolean>(false);
  const [customOrderModalOpen, setCustomOrderModalOpen] = useState(false);
  const [customOrderUrl, setCustomOrderUrl] = useState("");
  const [customOrderExpiresAt, setCustomOrderExpiresAt] = useState("");
  const [isCreatingCustomOrderLink, setIsCreatingCustomOrderLink] = useState(false);
  // External scanner state - check if any modal is open
  const anyModalOpen =
    showScanner ||
    modalDeliveryOpen ||
    modalStokQROpen ||
    modalPOQROpen ||
    modalPOScanOpen ||
    modalPackingOpen ||
    modalPackingKirimOpen ||
    modalPackingPOScanOpen ||
    modalPengirimanOpen ||
    scanProgressOpen ||
    customOrderModalOpen;

  const [externalScannerActive, setExternalScannerActive] = useState(false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimeoutRef = useRef<NodeJS.Timeout>();
  const router = useRouter();
  const { socket } = useWebSocket();
  const params = useParams();
  const normalizedWorkspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const normalizedBoardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const currentUser = useSelector(selectUser);
  const userRole = (currentUser?.role?.name || "").trim().toLowerCase();
  const isSuperAdmin =
    userRole === "super admin" ||
    userRole === "super_admin" ||
    userRole === "superadmin";
  const boardName = (currentBoard?.name || "").trim().toLowerCase();
  const isDateline = boardName === "dateline";
  const isListPOOutlet = boardName === "list po | outlet";

  // User board order hook for favorites
  const { userBoardOrder, toggleFavorite, isTogglingFavorite } =
    useUserBoardOrder(params.workspaceId as string);

  // Fetch workspace labels for filtering
  const { allLabels: workspaceLabels, isLoadingAllLabels: isLoadingLabels } =
    useLabels(params.workspaceId as string);

  // Move old cards hook
  const moveOldCardsMutation = useMoveOldCards();
  const isRequestDesainBoard =
    currentBoard?.name?.toLowerCase().includes("request desain") ?? false;
  const isExactRequestDesainBoard =
    currentBoard?.name?.trim().toLowerCase() === "request desain | outlet";
  const showMoveCardsButton = isRequestDesainBoard;
  const handleMoveCards = () => {
    moveOldCardsMutation.mutate();
  };
  const isMoveCardsPending = moveOldCardsMutation.isPending;
  const roleInList = (allowed: string[]) =>
    allowed.some((role) => role.toLowerCase() === userRole);
  const canGenerateCustomOrderLink =
    isExactRequestDesainBoard && roleInList(["Deal Maker", "SPV Deal Maker", "Super Admin"]);

  const handleCreateCustomOrderLink = async () => {
    if (!normalizedBoardId) return;

    setIsCreatingCustomOrderLink(true);
    try {
      const invitation = await createCustomOrderInvitation(normalizedBoardId);
      setCustomOrderUrl(invitation.url);
      setCustomOrderExpiresAt(invitation.expiresAt);
      setCustomOrderModalOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Gagal membuat link form custom");
    } finally {
      setIsCreatingCustomOrderLink(false);
    }
  };

  const handleCopyCustomOrderLink = async () => {
    if (!customOrderUrl) return;
    try {
      await navigator.clipboard.writeText(customOrderUrl);
      message.success("Link berhasil disalin");
    } catch {
      message.error("Link gagal disalin");
    }
  };

  console.log("[TOPBAR LOGS] Current User Role:", userRole);

  const canShowDelivery =
    isSuperAdmin ||
    (isDateline &&
      roleInList([
        "Kurir",
        "Kepala Produksi",
        "Admin Produksi",
        "Warehouse Bahan",
        "Kepala Gudang",
      ]));
  const canShowCetakQR =
    isSuperAdmin ||
    (isDateline &&
      roleInList([
        "Finishing & Packing",
        "Kepala Produksi",
        "Warehouse Produk",
        "Warehouse Bahan",
        "Kepala Gudang",
      ]));
  const canShowPacking =
    isSuperAdmin ||
    (isDateline && roleInList(["Finishing & Packing", "Kepala Produksi"]));

  // Determine if current board is favorited
  const isFavorited =
    userBoardOrder?.some(
      (order) => order.boardId === currentBoard?.id && order.isFavorite,
    ) || false;

  const handleStarClick = () => {
    console.log(
      "[FAVORITE LOGS] Topbar star clicked for board:",
      currentBoard?.id,
    );
    if (isTogglingFavorite) {
      console.log("[FAVORITE LOGS] Toggle already in progress, ignoring click");
      return;
    }
    if (currentBoard?.id) {
      console.log("[FAVORITE LOGS] Calling toggleFavorite from topbar");
      toggleFavorite(currentBoard.id);
    } else {
      console.log(
        "[FAVORITE LOGS] No current board, not calling toggleFavorite",
      );
    }
  };

  // External scanner - extract card ID from scanned data
  const extractCardIdFromScan = useCallback(
    async (scannedData: string): Promise<string | null> => {
      const trimmedData = scannedData.trim();
      if (trimmedData.length === 0) return null;

      // Check if it's a shortId URL format (e.g., https://domain.com/qr/123)
      try {
        const url = new URL(
          trimmedData.startsWith("http")
            ? trimmedData
            : `https://example.com${trimmedData}`,
        );
        const pathParts = url.pathname.split("/");

        // Check for /qr/[shortId] pattern
        if (pathParts.length >= 3 && pathParts[1] === "qr") {
          const shortId = parseInt(pathParts[2]);
          if (!isNaN(shortId)) {
            try {
              const response = await api.get(`/card/short/${shortId}`);
              if (response.data?.data?.id) {
                return response.data.data.id;
              }
            } catch (error) {
              console.warn("Failed to resolve shortId:", error);
            }
          }
        }

        // Check if it's a full card URL with cardId param
        const cardIdParam = sanitizeQueryParamId(url.searchParams.get("cardId"));
        if (cardIdParam) {
          return cardIdParam;
        }
      } catch (error) {
        // Not a valid URL
      }

      // If URL parsing fails, treat as direct card ID (UUID format)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(trimmedData)) {
        return trimmedData;
      }

      return null;
    },
    [],
  );

  // Handle external scanner result
  const handleExternalScan = useCallback(
    async (scannedData: string) => {
      console.log("[SCANNER] Scanned data:", scannedData);
      const cardId = await extractCardIdFromScan(scannedData);
      console.log("[SCANNER] Extracted card ID:", cardId);

      if (cardId) {
        message.success("Card found! Opening...");
        // Get the card details to find its list and board
        try {
          const response = await api.get(`/card/${cardId}`);
          const card = response.data?.data;

          if (card) {
            const listId = card.list_id;
            const boardId = card.list?.board_id || params.boardId;
            const workspaceId = params.workspaceId;

            // Navigate to the card
            router.push(
              `/workspace/${workspaceId}/board/${boardId}?cardId=${cardId}&listId=${listId}`,
            );
            setExternalScannerActive(false);
          } else {
            message.error("Card not found");
          }
        } catch (error) {
          console.error("[SCANNER] Error fetching card:", error);
          message.error("Could not find card from scanned data");
        }
      } else {
        message.error("Could not extract card ID from scanned data");
      }
    },
    [extractCardIdFromScan, params, router],
  );

  // Auto-enable scanner when no modals are open
  useEffect(() => {
    if (!anyModalOpen && !externalScannerActive) {
      setExternalScannerActive(true);
    } else if (anyModalOpen && externalScannerActive) {
      setExternalScannerActive(false);
    }
  }, [anyModalOpen, externalScannerActive]);

  // External scanner keyboard listener (capture phase to intercept before shortcuts)
  useEffect(() => {
    if (!externalScannerActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInputElement) {
        return;
      }

      // Skip scanner capture when card detail modal is open (allow shortcuts like "L")
      const isCardDetailOpen = document.querySelector(
        ".ant-modal-wrap:not(.ant-modal-wrap-hidden)",
      );
      if (isCardDetailOpen) {
        return;
      }

      // Check if it's Enter key (scanner typically sends Enter after scanning)
      if (event.key === "Enter") {
        const scannedData = scannerBufferRef.current.trim();
        if (scannedData.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          handleExternalScan(scannedData);
          scannerBufferRef.current = "";
        }
        return;
      }

      // Accumulate characters for scanner input (single printable chars)
      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        // Stop the event from reaching other handlers (like label shortcut)
        event.preventDefault();
        event.stopPropagation();

        scannerBufferRef.current += event.key;

        // Clear buffer after timeout (in case it's manual typing)
        if (scannerTimeoutRef.current) {
          clearTimeout(scannerTimeoutRef.current);
        }
        scannerTimeoutRef.current = setTimeout(() => {
          scannerBufferRef.current = "";
        }, 1000);
      }
    };

    // Use capture phase to intercept events before they reach other handlers
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [externalScannerActive, handleExternalScan]);

  const handleInvoiceSubmit = async () => {
    if (!invoiceNumber.trim()) {
      message.error("Please enter an invoice number");
      return;
    }

    setIsLoadingInvoice(true);
    try {
      const response = await api.post("/accurate/invoice/process", {
        soNumber: invoiceNumber.trim(),
      });

      const messageText =
        response?.data?.message || "Invoice added successfully";
      message.success(messageText);
      setInvoiceNumber("");
      setShowInvoiceInput(false);
      setInvoiceModalOpen(false);
    } catch (error: any) {
      console.error("Error submitting invoice:", error);
      const errorMessage =
        error?.response?.data?.message || "Failed to add invoice";
      message.error(errorMessage);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  // Delivery dropdown menu items
  const deliveryMenuItems: MenuProps["items"] = [
    {
      key: "delivery-stok",
      label: (
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span>Stok</span>
        </div>
      ),
      onClick: () => setModalPengirimanOpen(true), // Delivery > Stok opens Pengiriman modal
    },
    {
      key: "delivery-po",
      label: (
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} />
          <span>PO</span>
        </div>
      ),
      onClick: () => setModalPOScanOpen(true), // Opens PO scanning modal for validation
    },
  ];

  // Packing dropdown menu items
  const packingMenuItems: MenuProps["items"] = [
    {
      key: "packing-stok",
      label: (
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span>Stok</span>
        </div>
      ),
      onClick: () => setModalPackingOpen(true), // Packing > Stok opens Packing modal
    },
    {
      key: "packing-po",
      label: (
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} />
          <span>PO</span>
        </div>
      ),
      onClick: () => setModalPackingPOScanOpen(true), // Opens Packing PO Scan modal for card ID input
    },
  ];

  // Generate QR dropdown menu items (keeping for reference if needed)
  const generateQRMenuItems: MenuProps["items"] = [
    {
      key: "stok",
      label: (
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span>Stok</span>
        </div>
      ),
      onClick: () => setModalStokQROpen(true),
    },
    {
      key: "po",
      label: (
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} />
          <span>PO</span>
        </div>
      ),
      onClick: () => setModalPOQROpen(true),
    },
  ];

  const rightMenu: MenuProps["items"] = [
    {
      key: "track",
      label: (
        <Tooltip title={"track"}>
          <Button size="small" shape="default" variant="outlined">
            <span>10</span>
          </Button>
        </Tooltip>
      ),
    },
    {
      key: "filter",
      label: (
        <Tooltip title={"filtering loh ini"}>
          <Button size="small" shape="default">
            <SlidersHorizontal />
            <span>Filter</span>
          </Button>
        </Tooltip>
      ),
    },
    // {
    //   key: "members",
    //   label: "Members",
    // },
    // {
    //   key: "share",
    //   label: "Share",
    // },
  ];

  const labelFilterContent = (
    <div className="p-2 min-w-[280px] max-h-[450px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Typography.Text strong>Filter by Labels</Typography.Text>
        {selectedLabelIds.length > 0 && (
          <Button
            size="small"
            type="link"
            onClick={() => onLabelFilterChange?.([])}
            danger
          >
            Clear all
          </Button>
        )}
      </div>

      <Input
        placeholder="Search labels..."
        value={labelSearchQuery}
        onChange={(e) => setLabelSearchQuery(e.target.value)}
        className="mb-3"
        size="small"
        allowClear
      />

      {isLoadingLabels ? (
        <div className="text-center py-4 text-gray-500">Loading labels...</div>
      ) : workspaceLabels && workspaceLabels.length > 0 ? (
        <div className="overflow-y-auto flex-1">
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            {workspaceLabels
              .filter((label) =>
                label.name
                  .toLowerCase()
                  .includes(labelSearchQuery.toLowerCase()),
              )
              .sort((a, b) => {
                const aSelected = selectedLabelIds.includes(a.id);
                const bSelected = selectedLabelIds.includes(b.id);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;
                return a.name.localeCompare(b.name);
              })
              .map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => {
                    const isSelected = selectedLabelIds.includes(label.id);
                    if (isSelected) {
                      onLabelFilterChange?.(
                        selectedLabelIds.filter((id) => id !== label.id),
                      );
                    } else {
                      onLabelFilterChange?.([...selectedLabelIds, label.id]);
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedLabelIds.includes(label.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        onLabelFilterChange?.([...selectedLabelIds, label.id]);
                      } else {
                        onLabelFilterChange?.(
                          selectedLabelIds.filter((id) => id !== label.id),
                        );
                      }
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: label.value || "#gray" }}
                  />
                  <span className="flex-1">{label.name}</span>
                </div>
              ))}
          </Space>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No labels found in this workspace
        </div>
      )}
    </div>
  );

  const invoiceContent = (
    <div className="p-2">
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Typography.Text strong>Enter Invoice Number</Typography.Text>
        <Input
          placeholder="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          onPressEnter={handleInvoiceSubmit}
          style={{ width: "200px" }}
        />
        <Space>
          <Button
            type="primary"
            size="small"
            loading={isLoadingInvoice}
            onClick={handleInvoiceSubmit}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() => {
              setShowInvoiceInput(false);
              setInvoiceModalOpen(false);
              setInvoiceNumber("");
            }}
          >
            Cancel
          </Button>
        </Space>
      </Space>
    </div>
  );

  const mobileMenuItems: MenuProps["items"] = [];

  if (isSuperAdmin) {
    mobileMenuItems.push({
      key: "track",
      label: "Track",
      onClick: () => setOpenDashcardModal(true),
    });
  }

  if (isListPOOutlet) {
    mobileMenuItems.push({
      key: "packing-kirim",
      label: "Packing Kirim",
      onClick: () => setModalPackingKirimOpen(true),
    });
  }

  if (canGenerateCustomOrderLink) {
    mobileMenuItems.push({
      key: "custom-order-link",
      label: "Generate Link Form Custom",
      onClick: handleCreateCustomOrderLink,
    });
  }

  // Temporarily hide Invoice action from mobile topbar menu
  // if (isDateline) {
  //   mobileMenuItems.push({
  //     key: "invoice",
  //     label: "Invoice",
  //     onClick: () => setInvoiceModalOpen(true),
  //   });
  // }

  if (canShowCetakQR) {
    mobileMenuItems.push({
      key: "cetak-qr",
      label: "Cetak QR",
      children: generateQRMenuItems.map((item: any) => ({
        ...item,
        key: `cetak-qr-${item?.key}`,
      })),
    });
  }

  if (canShowPacking) {
    mobileMenuItems.push({
      key: "packing",
      label: "Packing",
      children: packingMenuItems,
    });
  }

  if (canShowDelivery) {
    mobileMenuItems.push({
      key: "delivery",
      label: "Delivery",
      children: deliveryMenuItems,
    });
  }

  if (showMoveCardsButton) {
    mobileMenuItems.push({
      key: "closing-terpending",
      label: "Closing Terpending",
      onClick: handleMoveCards,
    });
  }

  mobileMenuItems.push({
    key: "more",
    label: "More",
    onClick: () => setBoardScopeMenuOpen(true),
  });

  return (
    <div
      className="flex items-center justify-between h-auto min-h-[45px] absolute top-[45px] border-b border-gray-200 px-2 sm:px-4 py-1 sm:py-0 flex-wrap sm:flex-nowrap gap-2"
      style={{
        width: collapsed
          ? `calc(100% - ${siderSmall}px)`
          : `calc(100% - ${siderWide}px)`,
        backgroundColor: currentBoard?.background || "#fff",
      }}
    >
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="relative bg-white p-4 rounded-lg shadow-lg w-full max-w-[450px] flex flex-col items-center gap-4">
            <div className="relative w-full">
              <div className="flex items-center justify-center rounded-2xl bg-black/5">
                <div className="w-[320px] sm:w-[360px] h-[320px] sm:h-[360px] relative overflow-hidden rounded-xl bg-black/10">
                  <Scanner
                    onScan={(codes) => {
                      if (codes.length > 0) {
                        const url = codes[0].rawValue;
                        try {
                          // Check if the result is a valid URL
                          const parsedUrl = new URL(url);

                          // Check if the URL is from a valid domain
                          const urlString = url.toLowerCase();
                          const validDomains = [
                            "ozzyclothing.co.id",
                            "localhost",
                            "127.0.0.1",
                          ];
                          const isValidDomain = validDomains.some((domain) =>
                            urlString.includes(domain),
                          );
                          if (!isValidDomain) {
                            message.error("URL invalid.");
                            return;
                          }

                          setScanResult(url);
                          setShowScanner(false);
                          // Navigate to the scanned URL
                          router.push(url);
                        } catch (error) {
                          console.error("Invalid URL scanned:", error);
                          message.error(
                            "Invalid QR code. Please scan a valid URL.",
                          );
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error("Camera error:", error);
                      setShowScanner(false);
                    }}
                    styles={{
                      container: { width: "100%", height: "100%" },
                      video: { width: "100%", height: "100%" },
                    }}
                  />
                  <QRGuideOverlay />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowScanner(false)}
              className="mt-2 px-5 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 ml-2 sm:ml-5 min-w-0 flex-shrink-0">
        <title>{currentBoard?.name}</title>

        <Typography.Title
          level={4}
          className="m-0 text-sm sm:text-base truncate"
        >
          {currentBoard?.name}
        </Typography.Title>
        <Tooltip
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            size={16}
            className={`transition-colors cursor-pointer flex-shrink-0 ${
              isFavorited
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-400 hover:text-yellow-400"
            }`}
            onClick={handleStarClick}
            style={{
              opacity: isTogglingFavorite ? 0.6 : 1,
              pointerEvents: isTogglingFavorite ? ("none" as const) : "auto",
            }}
          />
        </Tooltip>
      </div>

      <div className="flex-shrink-0 w-auto order-3 sm:order-2">
        {showRightColMenu ? (
          <>
            <div className="hidden sm:flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
              {isSuperAdmin && (
                <Tooltip title={"track"}>
                  <Button
                    size="small"
                    shape="default"
                    variant="text"
                    onClick={() => {
                      setOpenDashcardModal(true);
                    }}
                  >
                    <div className="border rounded px-1 text-[7px]">10</div>
                    <span>Track</span>
                  </Button>
                </Tooltip>
              )}
              {isListPOOutlet && (
                <Tooltip title="Packing Kirim">
                  <Button
                    size="small"
                    shape="default"
                    variant="text"
                    icon={<Package size={16} />}
                    onClick={() => setModalPackingKirimOpen(true)}
                  >
                    <span>Packing Kirim</span>
                  </Button>
                </Tooltip>
              )}
              {canGenerateCustomOrderLink && (
                <Tooltip title="Generate Link Form Custom">
                  <Button
                    size="small"
                    icon={<Link2 size={16} />}
                    loading={isCreatingCustomOrderLink}
                    onClick={handleCreateCustomOrderLink}
                  >
                    <span>Form Custom</span>
                  </Button>
                </Tooltip>
              )}
              {onLabelFilterChange && (
                <Tooltip title="Filter by labels">
                  <Popover
                    open={labelFilterOpen}
                    onOpenChange={(open) => {
                      setLabelFilterOpen(open);
                      if (!open) setLabelSearchQuery("");
                    }}
                    content={labelFilterContent}
                    trigger="click"
                    placement="bottomRight"
                  >
                    <Button
                      size="small"
                      shape="default"
                      icon={<ListFilter size={16} />}
                      type={selectedLabelIds.length > 0 ? "primary" : "default"}
                    >
                      <span>Filter</span>
                      {selectedLabelIds.length > 0 && (
                        <Tag color="blue" className="ml-1">
                          {selectedLabelIds.length}
                        </Tag>
                      )}
                    </Button>
                  </Popover>
                </Tooltip>
              )}
              {/* Temporarily hide Invoice button from desktop topbar */}
              {/* {isListPOOutlet && (
                <Popover
                  content={invoiceContent}
                  trigger="click"
                  open={showInvoiceInput}
                  onOpenChange={setShowInvoiceInput}
                  placement="bottomRight"
                >
                  <Tooltip title="Add Invoice">
                    <Button
                      size="small"
                      icon={<FileText size={16} />}
                      onClick={() => setShowInvoiceInput(true)}
                    >
                      <span>Invoice</span>
                    </Button>
                  </Tooltip>
                </Popover>
              )} */}

              {canShowCetakQR && (
                <Dropdown
                  menu={{ items: generateQRMenuItems }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Tooltip title="Cetak QR">
                    <Button
                      size="small"
                      icon={<QrCode size={16} />}
                      className="flex items-center gap-1"
                    >
                      <span>Cetak QR</span>
                    </Button>
                  </Tooltip>
                </Dropdown>
              )}

              {canShowPacking && (
                <Dropdown
                  menu={{ items: packingMenuItems }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Tooltip title="Packing Options">
                    <Button
                      size="small"
                      className="flex items-center gap-1"
                      icon={<Package size={16} />}
                    >
                      <span>Packing</span>
                    </Button>
                  </Tooltip>
                </Dropdown>
              )}

              {canShowDelivery && (
                <Dropdown
                  menu={{ items: deliveryMenuItems }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Tooltip title="Delivery Options">
                    <Button
                      size="small"
                      className="flex items-center gap-1"
                      icon={<Truck size={16} />}
                    >
                      <span>Delivery</span>
                    </Button>
                  </Tooltip>
                </Dropdown>
              )}

              {/* <div>
              <MembersList
                members={members}
                membersLength={members.length}
                membersLoopLimit={2}
                openAddMember={openAddMember}
                setOpenAddMember={setOpenAddMember}
              />
            </div>
            <Tooltip title="Share board">
              <Button size="small" icon={<UserPlus size={16} />}>
                <span>Share</span>
              </Button>
            </Tooltip> */}
              <Tooltip title="Scan QR Code (Camera)">
                <Button
                  size="small"
                  icon={<QrCode size={16} />}
                  onClick={() => setShowScanner(true)}
                />
              </Tooltip>
              {/* Scanner is always active in background - button hidden */}
              {/* <Tooltip title={externalScannerActive ? "Scanner Active - Scan Now!" : "Open Card via Scanner"}>
              <Button
                size="small"
                icon={<ScanLine size={16} />}
                onClick={() => setExternalScannerActive(!externalScannerActive)}
                type={externalScannerActive ? "primary" : "default"}
                className={externalScannerActive ? "animate-pulse" : ""}
              />
            </Tooltip> */}
              {showMoveCardsButton && (
                <Tooltip title="Closing Terpending">
                  <Button
                    size="small"
                    icon={<ArrowRight size={16} />}
                    onClick={handleMoveCards}
                    loading={isMoveCardsPending}
                  >
                    <span>
                      {isMoveCardsPending ? "Moving..." : "Closing Terpending"}
                    </span>
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="more">
                <Button
                  type="text"
                  size="small"
                  icon={<Ellipsis size={16} />}
                  onClick={() => {
                    setBoardScopeMenuOpen(true);
                  }}
                ></Button>
              </Tooltip>
            </div>

            <div className="sm:hidden flex items-center gap-1">
              {onLabelFilterChange && (
                <Tooltip title="Filter">
                  <Button
                    size="small"
                    type={selectedLabelIds.length > 0 ? "primary" : "text"}
                    icon={<ListFilter size={18} />}
                    onClick={() => setLabelFilterModalOpen(true)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Scan QR">
                <Button
                  size="small"
                  type="text"
                  icon={<QrCode size={18} />}
                  onClick={() => setShowScanner(true)}
                />
              </Tooltip>
              <Dropdown
                menu={{ items: mobileMenuItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Tooltip title="Menu">
                  <Button
                    size="small"
                    type="text"
                    icon={<Menu size={18} />}
                    aria-label="Open menu"
                  />
                </Tooltip>
              </Dropdown>
            </div>
          </>
        ) : (
          <Dropdown
            menu={{ items: rightMenu }}
            trigger={["click"]}
            open={openRightMenu}
            onOpenChange={setOpenRightMenu}
          >
            <Tooltip title={"show more menu"}>
              <Button>
                <Menu size={16} />
              </Button>
            </Tooltip>
          </Dropdown>
        )}
      </div>

      <Modal
        open={labelFilterModalOpen}
        onCancel={() => {
          setLabelFilterModalOpen(false);
          setLabelSearchQuery("");
        }}
        footer={null}
        title="Filter by Labels"
        destroyOnClose
      >
        {labelFilterContent}
      </Modal>

      <Modal
        open={invoiceModalOpen}
        onCancel={() => {
          setInvoiceModalOpen(false);
          setInvoiceNumber("");
        }}
        footer={null}
        title="Invoice"
        destroyOnClose
      >
        {invoiceContent}
      </Modal>

      <ModalDelivery
        open={modalDeliveryOpen}
        onClose={() => setModalDeliveryOpen(false)}
      />
      <Modal
        open={customOrderModalOpen}
        title="Link Form Custom"
        onCancel={() => setCustomOrderModalOpen(false)}
        footer={null}
        destroyOnClose={false}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Text>
            Link ini hanya dapat digunakan satu kali dan berlaku sampai {customOrderExpiresAt ? new Date(customOrderExpiresAt).toLocaleString("id-ID") : "7 hari"}.
          </Typography.Text>
          <Input
            value={customOrderUrl}
            readOnly
            addonAfter={<Button type="link" onClick={handleCopyCustomOrderLink}>Salin</Button>}
          />
        </Space>
      </Modal>

      <ModalStokQR
        open={modalStokQROpen}
        onClose={() => setModalStokQROpen(false)}
      />

      <ModalPOQR
        open={modalPOQROpen}
        onClose={() => setModalPOQROpen(false)}
        boardId={params.boardId as string}
        listId={currentBoard?.lists?.[0]?.id} // Use first list as default, can be improved
      />

      <ModalPOScan
        open={modalPOScanOpen}
        onClose={() => setModalPOScanOpen(false)}
        boardId={params.boardId as string}
        listId={currentBoard?.lists?.[0]?.id} // Use first list as default, can be improved
      />

      <ModalPacking
        open={modalPackingOpen}
        onClose={() => setModalPackingOpen(false)}
      />

      <ModalPackingKirim
        open={modalPackingKirimOpen}
        onClose={() => setModalPackingKirimOpen(false)}
        workspaceId={params.workspaceId as string}
        boardId={params.boardId as string}
      />

      <ModalPackingPOScan
        open={modalPackingPOScanOpen}
        onClose={() => setModalPackingPOScanOpen(false)}
        workspaceId={params.workspaceId as string}
        boardId={params.boardId as string}
        listId={currentBoard?.lists?.[0]?.id} // Use first list as default, can be improved
        onOpenScanProgress={(cardId: string) => {
          setScanProgressCardId(cardId);
          setScanProgressOpen(true);
          setModalPackingPOScanOpen(false);
        }}
      />

      <ScanProgressModal
        isOpen={scanProgressOpen}
        onClose={() => setScanProgressOpen(false)}
        cardId={scanProgressCardId || ""}
        boardId={params.boardId as string}
      />

      <ModalPengiriman
        open={modalPengirimanOpen}
        onClose={() => setModalPengirimanOpen(false)}
      />
    </div>
  );
};

export default BoardTopbar;
