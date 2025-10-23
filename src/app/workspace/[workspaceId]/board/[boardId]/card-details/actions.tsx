import { uploadFile } from "@api/file";
import { getPOScanProgress, scanPOItem, ScanProgressResponse } from "@api/po";
import UploadModal from "@components/modal-upload/modal-upload";
import PopoverAttach from "@components/popover-attach";
import PopoverChecklist from "@components/popover-checklist";
import PopoverCopyCard from "@components/popover-copy-card";
import PopoverCustomField from "@components/popover-custom-field";
import PopoverDates from "@components/popover-dates.tsx";
import PopoverLabel from "@components/popover-label.tsx";
import PopoverLocation from "@components/popover-location";
import PopoverMirrorCard from "@components/popover-mirror-card";
import PopoverMoveCard from "@components/popover-move-card";
import PopoverUser from "@components/popover-user";
import { useCurrentAccount, usePermissions } from "@hooks/account";
import { useCards } from "@hooks/card";
import { useCardDetails } from "@hooks/card-details";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardMembers } from "@hooks/card_member";
import { EnumAttachmentType, EnumCardAttachmentType } from "@myTypes/card";
import { FileUpload } from "@myTypes/file-upload";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetailContext } from "@providers/card-detail-context";
import { selectIsDarkMode, selectTheme } from "@store/app_slice";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { LookupCache } from "@utils/lookup-cache";
import { Button, message, Modal, Progress, Tooltip } from "antd";
import {
  Archive,
  CheckSquare,
  Clock,
  Copy,
  FileCheck,
  FileText,
  FlipHorizontal,
  MapPin,
  MoveRight,
  Paperclip,
  QrCode,
  RectangleEllipsis,
  RotateCcw,
  ScanLine,
  Share2,
  Tag,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import AutomateButtons from "./automate-buttons";
import { usePOsByCardId } from "./bahan-fields/hooks/usePOsByCardId";
import QRModal from "./qr-modal/qr-modal";

// Helper component for permission-controlled buttons - moved outside to prevent re-creation
const PermissionButton: React.FC<{
  canPerform: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
  className?: string;
  disabled?: boolean;
  permissionLevel?: string;
  buttonStyle?: React.CSSProperties;
}> = ({
  canPerform,
  children,
  onClick,
  tooltip,
  className = "",
  disabled = false,
  permissionLevel = "unknown",
  buttonStyle = {},
}) => {
  const isDisabled = disabled || !canPerform;
  const tooltipText = !canPerform
    ? `Insufficient permissions (${permissionLevel} role)`
    : tooltip;

  return (
    <Tooltip title={tooltipText}>
      <button
        onClick={canPerform ? onClick : undefined}
        disabled={isDisabled}
        className={`text-xs flex items-center gap-3 w-full text-left py-2 px-2 rounded-md transition-colors mb-1 hover:opacity-80 ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
        style={buttonStyle}
      >
        {children}
      </button>
    </Tooltip>
  );
};

const Actions: React.FC = () => {
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openMembers, setOpenMembers] = useState(false);
  const [openDates, setOpenDates] = useState(false);
  const [openMoveCard, setOpenMoveCard] = useState(false);
  const [openCopyCard, setOpenCopyCard] = useState(false);
  const [openMirrorCard, setOpenMirrorCard] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);
  const [openAttach, setOpenAttach] = useState(false);
  const [openChecklist, setOpenChecklist] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const [openBuktiModal, setOpenBuktiModal] = useState(false);
  const [openPOModal, setOpenPOModal] = useState(false);

  // Scan Progress state
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressData, setProgressData] = useState<
    Record<string, ScanProgressResponse>
  >({});
  const [isScanBusy, setIsScanBusy] = useState(false);
  const [lastScanInfo, setLastScanInfo] = useState<{
    data: any;
    qr?: string;
    status?: "success" | "error" | "processing";
    message?: string;
  }>({ data: null });

  const { boardId } = useParams();
  const { selectedCard } = useCardDetailContext();
  const theme = useSelector(selectTheme) as any;
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  const { archiveCard, unarchiveCard } = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string
  );
  const { deleteCard } = useCards(
    selectedCard?.listId || "",
    boardId as string
  );

  // Get current user and card members
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const { isMember, toggleMember, isAddingMember, isRemovingMember } =
    useCardMembers(selectedCard?.id || "");

  // Get card attachments for Bukti functionality
  const { cardAttachments, addAttachment } = useCardAttachment(
    selectedCard?.id || ""
  );

  // Get board-specific permissions
  const {
    canManageCardMembers,
    canManageCardLabels,
    canManageCardDates,
    canManageCardAttachments,
    canManageCardChecklists,
    canManageCardCustomFields,
    canManageCardLocation,
    canMoveCard,
    canCopyCard,
    canMirrorCard,
    canArchiveCard,
    canDeleteCard,
    canShareCard,
    canGenerateQR,
  } = useBoardPermissionsContext();

  // Keep global permissions for observer status
  const { isObserver } = usePermissions();
  const permissionLevel = "BOARD_SPECIFIC"; // Use board-specific permissions

  // Scan Progress functionality
  const queryClient = useQueryClient();

  // Fetch PO data for scan progress
  const { data: apiPOData = [] } = usePOsByCardId(selectedCard?.id || "");

  // Queries for scan progress per PO (only when modal is open)
  const scanProgressQueries = useQueries({
    queries: apiPOData.map((po) => ({
      queryKey: ["po-scan-progress", po.id],
      queryFn: () => getPOScanProgress(po.id),
      enabled: isProgressOpen,
    })),
  });

  const isScanLoading = scanProgressQueries.some(
    (q) => q.isLoading || q.isFetching
  );
  const scanErrors = scanProgressQueries.filter((q) => q.error);

  // Handle join/leave card
  const handleJoinLeave = async () => {
    if (!currentUser?.id) {
      message.error("Please log in to join this card");
      return;
    }

    try {
      await toggleMember(currentUser.id);
      const action = isMember(currentUser.id) ? "left" : "joined";
      message.success(`Successfully ${action} the card`);
    } catch (error) {
      message.error("Failed to update card membership");
    }
  };

  // Scan Progress functions
  const openScanProgress = () => {
    setIsProgressOpen(true);
  };

  const closeScanProgress = () => {
    setIsProgressOpen(false);
  };

  // Update progress data when queries change
  useEffect(() => {
    if (scanProgressQueries.length > 0) {
      const newProgressData: Record<string, ScanProgressResponse> = {};
      const allUserIds = new Set<string>();

      scanProgressQueries.forEach((query, index) => {
        if (query.data && query.data.data && apiPOData[index]) {
          newProgressData[apiPOData[index].id] = query.data.data;

          // Collect user IDs for lookup
          query.data.data.items?.forEach((item: any) => {
            const userId = item.scannedBy || item.scanned_by;
            if (userId) allUserIds.add(userId);
          });
        }
      });

      setProgressData(newProgressData);
    }
  }, [scanProgressQueries, apiPOData]);

  // Hidden input ref for scanner
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Focus hidden input when modal opens and keep it focused
  useEffect(() => {
    if (isProgressOpen && scannerInputRef.current) {
      // Initial focus
      scannerInputRef.current.focus();

      // Refocus on any click in the modal
      const refocusInput = () => {
        if (scannerInputRef.current) {
          scannerInputRef.current.focus();
        }
      };

      // Refocus interval to ensure input stays focused
      const focusInterval = setInterval(refocusInput, 100);

      return () => {
        clearInterval(focusInterval);
      };
    }
  }, [isProgressOpen]);

  // Handle scan input from scanner
  const handleScanInput = async (scannedData: string) => {
    if (isScanBusy) return;

    console.log("🔍 [SCAN DEBUG] Raw scanned data:", scannedData);
    console.log("🔍 [SCAN DEBUG] Scanned data length:", scannedData.length);
    console.log("🔍 [SCAN DEBUG] Payload to send:", { qrCode: scannedData });

    setIsScanBusy(true);
    setLastScanInfo({
      data: scannedData,
      status: "processing",
      message: "Processing scan...",
    });

    try {
      const result = await scanPOItem({ qrCode: scannedData });
      console.log("✅ [SCAN DEBUG] API response:", result);

      setLastScanInfo({
        data: scannedData,
        status: "success",
        message: result.message || "Scan successful",
      });

      // Invalidate and refetch scan progress queries
      scanProgressQueries.forEach((_, index) => {
        if (apiPOData[index]) {
          queryClient.invalidateQueries({
            queryKey: ["po-scan-progress", apiPOData[index].id],
          });
        }
      });
    } catch (error: any) {
      setLastScanInfo({
        data: scannedData,
        status: "error",
        message: error.response?.data?.message || "Scan failed",
      });
    } finally {
      setIsScanBusy(false);
    }
  };

  // External scanner handling via hidden input
  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        handleScanInput(value);
        (e.target as HTMLInputElement).value = ""; // Clear input
      }
    }
  };

  // Check if current user is a member
  const isCurrentUserMember = currentUser?.id
    ? isMember(currentUser.id)
    : false;

  // Check if bukti attachment already exists
  const hasBuktiAttachment = () => {
    return cardAttachments?.some(
      (attachment) =>
        attachment.attachableType === EnumAttachmentType.File &&
        attachment.file?.name?.startsWith("bukti")
    );
  };

  // Check if PO attachment already exists
  const hasPOAttachment = () => {
    return cardAttachments?.some(
      (attachment) =>
        attachment.attachableType === EnumAttachmentType.File &&
        attachment.file?.name?.startsWith("PO")
    );
  };

  // Handle bukti upload
  const handleBuktiUpload = async (file: File, result: FileUpload) => {
    try {
      // Create a new file with the name "bukti" but keep the original extension
      const originalExtension = file.name.split(".").pop();
      const buktiFileName = originalExtension
        ? `bukti.${originalExtension}`
        : "bukti";

      // Create a new file object with the bukti name
      const buktiFile = new File([file], buktiFileName, { type: file.type });

      // Upload the file with the new name
      const buktiResult = await uploadFile(buktiFile);

      if (buktiResult?.data && selectedCard) {
        // Add the attachment with the bukti file
        addAttachment({
          cardId: selectedCard.id,
          attachableType: EnumAttachmentType.File,
          attachableId: buktiResult.data.id,
          isCover: false,
          type: EnumCardAttachmentType.Bukti,
        });

        message.success("Bukti uploaded successfully!");
        setOpenBuktiModal(false);
      }
    } catch (error) {
      message.error("Failed to upload bukti. Please try again.");
    }
  };

  // Handle PO upload
  const handlePOUpload = async (file: File, result: FileUpload) => {
    try {
      // Create a new file with the name "PO" but keep the original extension
      const originalExtension = file.name.split(".").pop();
      const poFileName = originalExtension
        ? `PO.${originalExtension}`
        : "PO";

      // Create a new file object with the PO name
      const poFile = new File([file], poFileName, { type: file.type });

      // Upload the file with the new name
      const poResult = await uploadFile(poFile);

      if (poResult?.data && selectedCard) {
        // Add the attachment with the PO file
        addAttachment({
          cardId: selectedCard.id,
          attachableType: EnumAttachmentType.File,
          attachableId: poResult.data.id,
          isCover: false,
          type: EnumCardAttachmentType.PO,
        });

        message.success("PO uploaded successfully!");
        setOpenPOModal(false);
      }
    } catch (error) {
      message.error("Failed to upload PO. Please try again.");
    }
  };

  // Theme-aware button styles
  const buttonStyle = {
    backgroundColor: `rgb(${colors.muted})`,
    color: `rgb(${colors.text})`,
    border: `1px solid rgb(${colors.border})`,
  };

  const buttonHoverStyle = {
    backgroundColor: `rgb(${colors.surface})`,
  };

  const iconStyle = {
    color: `rgb(${colors["text-muted"]})`,
  };

  const menuItems = [
    { icon: <Tag size={14} />, label: "Labels" },
    { icon: <CheckSquare size={14} />, label: "Checklist" },
  ];

  const handleArchival = () => {
    if (selectedCard?.id) {
      if (selectedCard?.archive) {
        unarchiveCard({ cardId: selectedCard?.id });
      } else {
        archiveCard({ cardId: selectedCard?.id });
      }
    }
  };

  const handleDeleteCard = () => {
    if (!selectedCard?.id || !selectedCard?.listId) return;

    Modal.confirm({
      title: "Delete Card",
      content: (
        <div className="py-4">
          <p className="mb-0">
            Are you sure you want to delete{" "}
            <strong>"{selectedCard.name}"</strong>?
          </p>
          <p className="mb-0 text-gray-600 mt-2">
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      styles: {
        body: {
          padding: "4rem",
        },
      },
      width: 450,
      centered: true,
      onOk: () => {
        deleteCard({ cardId: selectedCard.id, listId: selectedCard.listId });
        message.success("Card deleted successfully!");
      },
    });
  };

  return (
    <div className="w-full rounded-lg">
      {/* Join/Leave Button */}
      <Tooltip
        title={isCurrentUserMember ? "Leave this card" : "Join this card"}
      >
        <button
          onClick={handleJoinLeave}
          disabled={
            isAddingMember || isRemovingMember || !canManageCardMembers()
          }
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 rounded-md transition-colors mb-1 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
          style={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            {isCurrentUserMember ? (
              <UserMinus size={14} />
            ) : (
              <UserPlus size={14} />
            )}
          </span>
          <span className="text-xs">
            {isAddingMember || isRemovingMember
              ? "Loading..."
              : isCurrentUserMember
              ? "Leave"
              : "Join"}
          </span>
        </button>
      </Tooltip>

      {/* Menu Items */}
      {/* Labels Button */}
      {canManageCardLabels() ? (
        <PopoverLabel
          open={openLabels}
          setOpen={setOpenLabels}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardLabels()}
              tooltip="Manage card labels"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <Tag size={14} />
              </span>
              <span className="text-xs">Labels</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardLabels()}
          tooltip="Manage card labels"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <Tag size={14} />
          </span>
          <span className="text-xs">Labels</span>
        </PermissionButton>
      )}

      {/* Regular menu items (excluding Checklist and Labels) */}
      {menuItems
        .filter((item) => item.label !== "Checklist" && item.label !== "Labels")
        .map((item, index) => (
          <button
            key={index}
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 rounded-md transition-colors mb-1 hover:opacity-80"
            style={buttonStyle}
          >
            <span className="text-xs" style={iconStyle}>
              {item.icon}
            </span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}

      {/* Checklist with Popover */}
      {canManageCardChecklists() ? (
        <PopoverChecklist
          open={openChecklist}
          setOpen={setOpenChecklist}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardChecklists()}
              tooltip="Manage card checklists"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <CheckSquare size={14} />
              </span>
              <span className="text-xs">Checklist</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardChecklists()}
          tooltip="Manage card checklists"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <CheckSquare size={14} />
          </span>
          <span className="text-xs">Checklist</span>
        </PermissionButton>
      )}

      {/* Attachment */}
      {canManageCardAttachments() ? (
        <PopoverAttach
          open={openAttach}
          setOpen={setOpenAttach}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardAttachments()}
              tooltip="Manage card attachments"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <Paperclip size={14} />
              </span>
              <span className="text-xs">Attachment</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardAttachments()}
          tooltip="Manage card attachments"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <Paperclip size={14} />
          </span>
          <span className="text-xs">Attachment</span>
        </PermissionButton>
      )}

      {/* Bukti Button */}
      <PermissionButton
        canPerform={canManageCardAttachments()}
        onClick={() => setOpenBuktiModal(true)}
        tooltip={
          hasBuktiAttachment() ? "Bukti already exists" : "Upload bukti file"
        }
        permissionLevel={permissionLevel}
        buttonStyle={buttonStyle}
        disabled={hasBuktiAttachment()}
      >
        <span className="text-xs" style={iconStyle}>
          <FileCheck size={14} />
        </span>
        <span className="text-xs">Bukti</span>
      </PermissionButton>

      {/* PO Button */}
      <PermissionButton
        canPerform={canManageCardAttachments()}
        onClick={() => setOpenPOModal(true)}
        tooltip={
          hasPOAttachment() ? "PO already exists" : "Upload PO file"
        }
        permissionLevel={permissionLevel}
        buttonStyle={buttonStyle}
        disabled={hasPOAttachment()}
      >
        <span className="text-xs" style={iconStyle}>
          <FileText size={14} />
        </span>
        <span className="text-xs">PO</span>
      </PermissionButton>

      {/* Buat SO Button */}
      <PermissionButton
        canPerform={canManageCardAttachments()}
        onClick={() => {
          // TODO: Implement Buat SO functionality
          message.info("Buat SO functionality will be implemented later");
        }}
        tooltip="Create Sales Order"
        permissionLevel={permissionLevel}
        buttonStyle={buttonStyle}
      >
        <span className="text-xs" style={iconStyle}>
          <FileText size={14} />
        </span>
        <span className="text-xs">Buat SO (wip)</span>
      </PermissionButton>

      {/* Location */}
      {canManageCardLocation() ? (
        <PopoverLocation
          open={openLocation}
          setOpen={setOpenLocation}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardLocation()}
              tooltip="Manage card location"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <MapPin size={14} />
              </span>
              <span className="text-xs">Location</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardLocation()}
          tooltip="Manage card location"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <MapPin size={14} />
          </span>
          <span className="text-xs">Location</span>
        </PermissionButton>
      )}

      {/* Members */}
      {canManageCardMembers() ? (
        <PopoverUser
          open={openMembers}
          setOpen={setOpenMembers}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardMembers()}
              tooltip="Manage card members"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <Users size={14} />
              </span>
              <span className="text-xs">Members</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardMembers()}
          tooltip="Manage card members"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <Users size={14} />
          </span>
          <span className="text-xs">Members</span>
        </PermissionButton>
      )}

      {/* Dates */}
      {canManageCardDates() ? (
        <PopoverDates
          open={openDates}
          setOpen={setOpenDates}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardDates()}
              tooltip="Manage card dates"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <Clock size={14} />
              </span>
              <span className="text-xs">Dates</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardDates()}
          tooltip="Manage card dates"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <Clock size={14} />
          </span>
          <span className="text-xs">Dates</span>
        </PermissionButton>
      )}

      {/* Custom Fields */}
      {canManageCardCustomFields() ? (
        <PopoverCustomField
          open={openCustomField}
          setOpen={setOpenCustomField}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardCustomFields()}
              tooltip="Manage custom fields"
              permissionLevel={permissionLevel}
              buttonStyle={buttonStyle}
            >
              <span className="text-xs" style={iconStyle}>
                <RectangleEllipsis size={14} />
              </span>
              <span className="text-xs">Custom fields</span>
            </PermissionButton>
          }
        />
      ) : (
        <PermissionButton
          canPerform={canManageCardCustomFields()}
          tooltip="Manage custom fields"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <RectangleEllipsis size={14} />
          </span>
          <span className="text-xs">Custom fields</span>
        </PermissionButton>
      )}

      {/* Power-Ups Section */}
      {/* <div className="mt-4 mb-2">
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Power-Ups</h3>
        <button
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
          <Plus size={14} />
          <span className="text-xs">Add Power-Ups</span>
        </button>
      </div> */}

      {/* Automation Section */}
      {/* <div className="mt-4 mb-2 flex items-center justify-between px-4">
        <h3 className="text-sm font-medium text-gray-600">Automation</h3>
        <InfoCircle size={14} className="text-gray-500" />
      </div>
      <button
        className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
      >
        <Plus size={14} />
        <span className="text-xs">Add button</span>
      </button> */}

      {/* Actions Section */}
      <div className="mt-4 mb-2">
        <h3
          className="text-sm font-medium px-4 mb-2"
          style={{ color: `rgb(${colors["text-muted"]})` }}
        >
          Actions
        </h3>

        {/* Automate Buttons */}
        <AutomateButtons />

        {/* Move Card */}
        {canMoveCard() ? (
          <PopoverMoveCard
            open={openMoveCard}
            setOpen={setOpenMoveCard}
            triggerEl={
              <PermissionButton
                canPerform={canMoveCard()}
                tooltip="Move this card to another list"
                permissionLevel={permissionLevel}
                buttonStyle={buttonStyle}
              >
                <MoveRight size={14} />
                <span className="text-xs">Move</span>
              </PermissionButton>
            }
          />
        ) : (
          <PermissionButton
            canPerform={canMoveCard()}
            tooltip="Move this card to another list"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <MoveRight size={14} />
            <span className="text-xs">Move</span>
          </PermissionButton>
        )}

        {/* Copy Card */}
        {canCopyCard() ? (
          <PopoverCopyCard
            open={openCopyCard}
            setOpen={setOpenCopyCard}
            triggerEl={
              <PermissionButton
                canPerform={canCopyCard()}
                tooltip="Copy this card to another list"
                permissionLevel={permissionLevel}
                buttonStyle={buttonStyle}
              >
                <Copy size={14} />
                <span className="text-xs">Copy</span>
              </PermissionButton>
            }
          />
        ) : (
          <PermissionButton
            canPerform={canCopyCard()}
            tooltip="Copy this card to another list"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <Copy size={14} />
            <span className="text-xs">Copy</span>
          </PermissionButton>
        )}

        {/* Mirror Card */}
        {canMirrorCard() ? (
          <PopoverMirrorCard
            open={openMirrorCard}
            setOpen={setOpenMirrorCard}
            triggerEl={
              <PermissionButton
                canPerform={canMirrorCard()}
                tooltip="Mirror this card"
                permissionLevel={permissionLevel}
                buttonStyle={buttonStyle}
              >
                <FlipHorizontal size={14} />
                <span className="text-xs">Mirror</span>
              </PermissionButton>
            }
          />
        ) : (
          <PermissionButton
            canPerform={canMirrorCard()}
            tooltip="Mirror this card"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <FlipHorizontal size={14} />
            <span className="text-xs">Mirror</span>
          </PermissionButton>
        )}

        {/* Archive/Restore Card */}
        <PermissionButton
          canPerform={canArchiveCard()}
          onClick={handleArchival}
          tooltip={
            selectedCard?.archive ? "Restore this card" : "Archive this card"
          }
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          {selectedCard?.archive ? (
            <>
              <RotateCcw size={14} />
              <span className="text-xs">Restore</span>
            </>
          ) : (
            <>
              <Archive size={14} />
              <span className="text-xs">Archive</span>
            </>
          )}
        </PermissionButton>

        {/* Delete Card (only for archived cards) */}
        {selectedCard?.archive && (
          <PermissionButton
            canPerform={canDeleteCard()}
            onClick={handleDeleteCard}
            tooltip="Delete this card permanently"
            className="text-red-600"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <Trash2 size={14} />
            <span className="text-xs">Delete</span>
          </PermissionButton>
        )}

        {/* Share Card */}
        <PermissionButton
          canPerform={canShareCard()}
          onClick={() => {
            const url = `${window.location.href}?listId=${selectedCard?.listId}&cardId=${selectedCard?.id}`;
            navigator.clipboard.writeText(url);
            message.info("Copied to clipboard");
          }}
          tooltip="Share this card with others by copying the link"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <Share2 size={14} />
          <span className="text-xs">Share</span>
        </PermissionButton>

        {/* Generate QR Code */}
        <PermissionButton
          canPerform={canGenerateQR()}
          onClick={() => setOpenQrModal(true)}
          tooltip="Generate this card QR code"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <QrCode size={14} />
          <span className="text-xs">Generate QR</span>
        </PermissionButton>

        {/* Scan Progress */}
        {apiPOData.length > 0 && (
          <PermissionButton
            canPerform={true}
            onClick={openScanProgress}
            tooltip="View scan progress for PO items"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <ScanLine size={14} />
            <span className="text-xs">Scan Progress</span>
          </PermissionButton>
        )}

        <QRModal isOpen={openQrModal} onClose={() => setOpenQrModal(false)} />

        {/* Scan Progress Modal */}
        <Modal
          title="Scan Progress"
          open={isProgressOpen}
          onCancel={closeScanProgress}
          footer={[
            <Button key="close" onClick={closeScanProgress}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {/* Hidden input to capture scanner */}
          <input
            ref={scannerInputRef}
            type="text"
            onChange={(e) =>
              console.log("📝 [INPUT DEBUG] Value changed:", e.target.value)
            }
            onKeyDown={handleScannerInput}
            onBlur={(e) => e.target.focus()} // Prevent losing focus
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0,
              width: "1px",
              height: "1px",
              border: "none",
              padding: 0,
              margin: 0,
            }}
            autoFocus
          />
          {/* Click anywhere to refocus */}
          <div onClick={() => scannerInputRef.current?.focus()}>
            <div className="space-y-4">
              {/* Loading State */}
              {(isScanLoading || isScanBusy) && (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-600">
                    {isScanBusy
                      ? "Processing scan..."
                      : "Loading scan progress..."}
                  </div>
                </div>
              )}

              {/* Error State */}
              {scanErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 font-medium mb-2">Errors:</div>
                  {scanErrors.map((error, index) => (
                    <div key={index} className="text-red-700 text-sm">
                      {error.error?.message || "Unknown error"}
                    </div>
                  ))}
                </div>
              )}

              {/* PO Scan Progress */}
              {apiPOData.reverse().map((po, idx) => {
                const prog = progressData[po.id];
                const scanned = prog?.scanned ?? 0;
                const total = prog?.total ?? 0;
                const percentage = prog?.percentage ?? 0;
                return (
                  <div key={po.id} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">PO: {idx + 1} </span>
                      <span className="text-sm font-medium">
                        {scanned}/{total} ({percentage}%)
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress
                        percent={percentage}
                        size="small"
                        showInfo={false}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      {(prog?.items || [])
                        .slice()
                        .sort((a: any, b: any) => {
                          // Stable sort by size then itemNumber ascending
                          const sizeCmp = String(a.size).localeCompare(
                            String(b.size)
                          );
                          if (sizeCmp !== 0) return sizeCmp;
                          const aNum =
                            typeof a.itemNumber === "number"
                              ? a.itemNumber
                              : a.item_number ?? 0;
                          const bNum =
                            typeof b.itemNumber === "number"
                              ? b.itemNumber
                              : b.item_number ?? 0;
                          return aNum - bNum;
                        })
                        .map((item: any) => {
                          const scannedAt = item.scannedAt || item.scanned_at;
                          const scannedByUserId =
                            item.scannedBy || item.scanned_by;
                          // Prefer backend-provided name, fallback to lookup cache, then UUID
                          const scannedByName =
                            item.scannedByName ||
                            item.scanned_by_name ||
                            (scannedByUserId
                              ? LookupCache.label("user", scannedByUserId)
                              : null) ||
                            scannedByUserId;
                          const subcategoryName =
                            item.subcategoryName || item.subcategory_name;
                          const formattedTime = scannedAt
                            ? new Date(scannedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : null;

                          return (
                            <div
                              key={item.id}
                              className={`rounded-md bg-white border px-3 py-2 ${
                                item.scanned
                                  ? "border-green-200"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-sm">
                                    {item.size}-
                                    {String(
                                      item.itemNumber ?? item.item_number
                                    ).padStart(3, "0")}
                                  </span>
                                  {subcategoryName && (
                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                                      {subcategoryName}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    item.scanned
                                      ? "bg-green-100 text-green-700 border border-green-200"
                                      : "bg-gray-100 text-gray-700 border border-gray-200"
                                  }`}
                                >
                                  {item.scanned ? "✓ Scanned" : "Pending"}
                                </span>
                              </div>
                              {item.scanned &&
                                (scannedByName || formattedTime) && (
                                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                    {scannedByName && (
                                      <span className="flex items-center gap-1">
                                        <span className="font-medium">By:</span>
                                        <span>{scannedByName}</span>
                                      </span>
                                    )}
                                    {formattedTime && (
                                      <span className="flex items-center gap-1">
                                        <span className="font-medium">At:</span>
                                        <span>{formattedTime}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {!isScanLoading && apiPOData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No scan progress data available
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Bukti Upload Modal */}
        <UploadModal
          isVisible={openBuktiModal}
          onClose={() => setOpenBuktiModal(false)}
          onUploadComplete={handleBuktiUpload}
          title="Upload Bukti"
        />

        {/* PO Upload Modal */}
        <UploadModal
          isVisible={openPOModal}
          onClose={() => setOpenPOModal(false)}
          onUploadComplete={handlePOUpload}
          title="Upload PO"
        />
      </div>
    </div>
  );
};

export default Actions;
