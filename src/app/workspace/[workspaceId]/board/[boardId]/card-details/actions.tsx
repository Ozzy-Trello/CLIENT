"use client";
// import { uploadFile } from "@api/file"; // Moved to index.tsx
import { generateQRCodesPDF } from "@api/qr";
// import UploadModal from "@components/modal-upload/modal-upload"; // Moved to index.tsx
import ScanProgressModal from "@components/scan-progress-modal";
// import ModalBuatSO from "@components/modal-buat-so"; // Moved to index.tsx
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
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardMembers } from "@hooks/card_member";
import { EnumAttachmentType, EnumCardAttachmentType } from "@myTypes/card";
// import { FileUpload } from "@myTypes/file-upload"; // Moved to index.tsx
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetailContext } from "@providers/card-detail-context";
import { selectIsDarkMode, selectTheme } from "@store/app_slice";
import { selectCurrentBoard } from "@store/workspace_slice";
import { useQueryClient } from "@tanstack/react-query";
import { Button, message, Modal, Tooltip } from "antd";
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
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import AutomateButtons from "./automate-buttons";
import { LookupCache } from "@utils/lookup-cache";
import { useBoardDetails } from "@hooks/board";
import { resolve } from "path";

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

const Actions: React.FC<{
  boardName?: string;
  userRole?: string;
  isSuperAdmin?: boolean;
  exclude?: string[];
  card?: { id: string; listId?: string } | null;
  onOpenBuktiModal?: () => void;
  onOpenPOModal?: () => void;
  onOpenBuatSOModal?: () => void;
}> = ({ boardName, userRole, isSuperAdmin, exclude = [], card, onOpenBuktiModal, onOpenPOModal, onOpenBuatSOModal }) => {
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openMembers, setOpenMembers] = useState(false);
  const [openDates, setOpenDates] = useState(false);
  const [openMoveCard, setOpenMoveCard] = useState(false);
  const [openCopyCard, setOpenCopyCard] = useState(false);
  const [openMirrorCard, setOpenMirrorCard] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);
  const [openAttach, setOpenAttach] = useState(false);
  const [openChecklist, setOpenChecklist] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  // Moved to index.tsx:
  // const [openBuktiModal, setOpenBuktiModal] = useState(false);
  // const [openPOModal, setOpenPOModal] = useState(false);
  // const [openBuatSOModal, setOpenBuatSOModal] = useState(false);
  // const [isPOPelengkap, setIsPOPelengkap] = useState(false);

  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const params = useParams();
  const boardId = params.boardId as string;
  const workspaceId = params.workspaceId as string;
  const searchParams = useSearchParams();
  const { selectedCard } = useCardDetailContext();

  // Use card prop if provided, fallback to context/URL
  const cardIdFromUrl = searchParams.get("cardId");
  const currentCardId = card?.id || selectedCard?.id || cardIdFromUrl || "";


  const NO_FAKTUR_CUSTOM_FIELD_ID = "6c7f05f1-85bc-42f3-98b2-6a6509cc539c";

  const { cardCustomFields, isLoading: isLoadingCardCustomFields } =
    useCardCustomField(selectedCard?.id || "", workspaceId, {
      enabled: !!selectedCard?.id && !!workspaceId,
    });

  const noFakturValue = useMemo(() => {
    const normalizeId = (field: any) =>
      String(
        field?.id ?? field?.customFieldId ?? field?.custom_field_id ?? "",
      ).trim();

    const getValue = (field: any) => {
      const raw =
        field?.valueString ??
        field?.value_string ??
        field?.valueOption ??
        field?.value_option ??
        field?.valueNumber ??
        field?.value_number ??
        "";
      return raw === null || raw === undefined ? "" : String(raw).trim();
    };

    const sources: any[][] = [
      Array.isArray(cardCustomFields) ? cardCustomFields : [],
      Array.isArray(selectedCard?.customFields)
        ? selectedCard?.customFields
        : [],
    ];

    for (const fields of sources) {
      const byId = fields.find(
        (f: any) => normalizeId(f) === NO_FAKTUR_CUSTOM_FIELD_ID,
      );
      const byName = fields.find(
        (f: any) =>
          String(f?.name || "")
            .trim()
            .toLowerCase() === "no faktur",
      );

      const v1 = byId ? getValue(byId) : "";
      if (v1) return v1;

      const v2 = byName ? getValue(byName) : "";
      if (v2) return v2;
    }

    // last resort: some endpoints include this shaped field
    return String((selectedCard as any)?.noFaktur || "").trim();
  }, [cardCustomFields, selectedCard?.customFields, selectedCard]);

  const isBuatSODisabled = isLoadingCardCustomFields || !!noFakturValue;

  const theme = useSelector(selectTheme) as any;
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  const { archiveCard, unarchiveCard } = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string,
  );
  const { deleteCard } = useCards(
    selectedCard?.listId || "",
    boardId as string,
  );

  // Get current user and card members
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const roleLower = (userRole || currentUser?.role?.name || "")
    .trim()
    .toLowerCase();
  const superAdmin =
    isSuperAdmin ||
    roleLower === "super admin" ||
    roleLower === "super_admin" ||
    roleLower === "superadmin";

  const { board: fetchedBoard } = useBoardDetails(
    boardId as string,
    workspaceId as string,
    { enabled: !!boardId },
  );
  const currentBoardFromStore = useSelector(selectCurrentBoard);
  const storeBoardName = currentBoardFromStore?.name?.trim() || "";
  const resolvedBoardName = (
    boardName ||
    storeBoardName ||
    LookupCache.label("board", boardId as string) ||
    fetchedBoard?.name ||
    ""
  )
    .trim()
    .toLowerCase();

  const isDateline = resolvedBoardName === "dateline";
  const isDelivery = resolvedBoardName === "delivery";
  const isListPOOutlet = resolvedBoardName === "list po | outlet";

  console.log(resolvedBoardName, "<<< ini apa");

  const roleIn = (roles: string[]) =>
    roles.some((r) => r.toLowerCase() === roleLower);
  const { isMember, toggleMember, isAddingMember, isRemovingMember } =
    useCardMembers(selectedCard?.id || "");

  // Get card attachments for Bukti functionality
  const { cardAttachments } = useCardAttachment(
    selectedCard?.id || "",
  );
  // NOTE: poUploadSequenceRef and poGeneratedNamesRef moved to index.tsx

  // Get board-specific permissions
  const {
    canManageCardMembers,
    canManageCardLabels,
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
  const canGenerateQRPermission = canGenerateQR;

  const canPOActions =
    superAdmin || (isDateline && roleIn(["admin produksi", "kepala produksi"]));
  const canBuatSO = canPOActions;
  const canGenerateQRFinal =
    superAdmin ||
    ((isListPOOutlet || isDateline || isDelivery) && roleLower !== "kurir");
  const canInvoice =
    superAdmin || (isListPOOutlet && roleIn(["deal maker", "spv deal maker"]));
  const canBukti =
    superAdmin || (isListPOOutlet && roleIn(["deal maker", "spv deal maker"]));

  // Keep global permissions for observer status
  const { isObserver } = usePermissions();
  const permissionLevel = "BOARD_SPECIFIC"; // Use board-specific permissions

  // Scan Progress functionality
  const queryClient = useQueryClient();

  // NOTE: PO upload sequence reset useEffect moved to index.tsx

  const getPOCount = () =>
    (cardAttachments || []).filter(
      (attachment) =>
        attachment.attachableType === EnumAttachmentType.File &&
        attachment.type === EnumCardAttachmentType.PO,
    ).length;

  // NOTE: buildPOFileName moved to index.tsx

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

  // Check if current user is a member
  const isCurrentUserMember = currentUser?.id
    ? isMember(currentUser.id)
    : false;

  // Check if bukti attachment already exists
  const hasBuktiAttachment = () => {
    return cardAttachments?.some(
      (attachment) =>
        attachment.attachableType === EnumAttachmentType.File &&
        attachment.file?.name?.startsWith("bukti"),
    );
  };

  // Check if PO attachment already exists
  const hasPOAttachment = () => {
    return cardAttachments?.some(
      (attachment) =>
        attachment.attachableType === EnumAttachmentType.File &&
        attachment.file?.name?.startsWith("PO"),
    );
  };

  // NOTE: handleBuktiUpload, handlePOBeforeUpload, handlePOUpload moved to index.tsx

  // Handle QR generation using topbar's PO QR logic
  const handleGenerateQR = async () => {
    if (!selectedCard?.id) {
      message.error("No card selected for QR generation");
      return;
    }

    try {
      // Use the same logic as topbar's PO QR generation
      const blob = await generateQRCodesPDF(selectedCard.id);

      // Create URL for the blob and open in new tab for printing
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");

      if (newWindow) {
        // Clean up the URL after a delay to allow the PDF to load
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        message.success("QR code PDF generated successfully!");
      } else {
        message.error(
          "Failed to open PDF. Please check your popup blocker settings.",
        );
      }
    } catch (error) {
      console.error("Error generating QR PDF:", error);
      message.error("Failed to generate QR code PDF. Please try again.");
    }
  };

  // Theme-aware button styles
  const buttonStyle = {
    backgroundColor: `rgb(${colors.muted})`,
    color: `rgb(${colors.text})`,
    border: `1px solid rgb(${colors.border})`,
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    color: "#dc2626",
    border: "1px solid #fecdd3",
    backgroundColor: "#fff1f2",
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
      {/* Labels Button (Super Admin only) */}
      {!exclude.includes("Labels") && superAdmin &&
        (canManageCardLabels() ? (
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
        ))}

      {/* Regular menu items (excluding Checklist and Labels and any passed in exclude) */}
      {menuItems
        .filter((item) => item.label !== "Checklist" && item.label !== "Labels" && !exclude.includes(item.label))
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
      {!exclude.includes("Checklist") && (canManageCardChecklists() ? (
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
      ))}

      {/* Attachment */}
      {!exclude.includes("Attachment") && (canManageCardAttachments() ? (
        <PopoverAttach
          open={openAttach}
          setOpen={setOpenAttach}
          triggerEl={
            <PermissionButton
              canPerform={canManageCardAttachments()}
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
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <Paperclip size={14} />
          </span>
          <span className="text-xs">Attachment</span>
        </PermissionButton>
      ))}

      {/* Bukti Button */}
      {!exclude.includes("Upload Bukti") && (
        <PermissionButton
          canPerform={canBukti && canManageCardAttachments()}
          onClick={() => onOpenBuktiModal?.()}
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
          <span className="text-xs">Upload Bukti</span>
        </PermissionButton>
      )}

      {/* PO Button */}
      {!exclude.includes("Upload File PO") && (
        <PermissionButton
          canPerform={canPOActions && canManageCardAttachments()}
          onClick={() => onOpenPOModal?.()}
          tooltip={"Upload PO file"}
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
        >
          <span className="text-xs" style={iconStyle}>
            <FileText size={14} />
          </span>
          <span className="text-xs">Upload File PO</span>
        </PermissionButton>
      )}

      {/* Buat SO Button */}
      {!exclude.includes("Buat SO") && (
        <PermissionButton
          canPerform={canBuatSO && canManageCardAttachments()}
          onClick={() => {
            if (isBuatSODisabled) {
              message.error("SO Sudah ada");
              return;
            }
            onOpenBuatSOModal?.();
          }}
          tooltip={isBuatSODisabled ? "SO Sudah ada" : "Create Sales Order"}
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
          disabled={isBuatSODisabled}
        >
          <span className="text-xs" style={iconStyle}>
            <FileText size={14} />
          </span>
          <span className="text-xs">Buat SO</span>
        </PermissionButton>
      )}

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
      {!exclude.includes("Members") && (canManageCardMembers() ? (
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
      ))}

      {/* Dates */}
      {!exclude.includes("Dates") && (
        <PopoverDates
          open={openDates}
          setOpen={setOpenDates}
          triggerEl={
            <PermissionButton
              canPerform={true}
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
      )}

      {/* Custom Fields (Super Admin only) */}
      {superAdmin &&
        (canManageCardCustomFields() ? (
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
        ))}

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
        {!exclude.includes("Automation") && <AutomateButtons />}

        {/* Move Card (Super Admin only) */}
        {superAdmin &&
          (canMoveCard() ? (
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
          ))}

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

        {/* Archive/Restore Card (Super Admin only) */}
        {superAdmin && (
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
        )}

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

        {/* Delete Card (Super Admin) */}
        {superAdmin && !selectedCard?.archive && (
          <PermissionButton
            canPerform={true}
            onClick={handleDeleteCard}
            tooltip="Delete this card permanently"
            className="text-red-600"
            permissionLevel={permissionLevel}
            buttonStyle={deleteButtonStyle}
          >
            <Trash2 size={14} />
            <span className="text-xs">Delete (Super Admin)</span>
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
        {!exclude.includes("Generate QR") && (
          <PermissionButton
            canPerform={canGenerateQRFinal && canGenerateQRPermission()}
            onClick={canGenerateQRFinal ? handleGenerateQR : undefined}
            tooltip="Generate this card QR code PDF"
            permissionLevel={permissionLevel}
            buttonStyle={buttonStyle}
          >
            <QrCode size={14} />
            <span className="text-xs">Generate QR</span>
          </PermissionButton>
        )}

        {/* Scan Progress */}
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

        {/* Scan Progress Modal */}
        <ScanProgressModal
          isOpen={isProgressOpen}
          onClose={closeScanProgress}
          cardId={selectedCard?.id || ""}
          boardId={boardId as string}
        />

        {/* NOTE: Bukti, PO, and Buat SO modals are now in index.tsx */}
        {/* These were moved outside actions.tsx for better state management */}
      </div>
    </div>
  );
};

export default Actions;
