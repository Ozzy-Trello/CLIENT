import MembersList from "@components/members-list";
import { useCardDetailContext } from "@providers/card-detail-context";
import {
  Button,
  Checkbox,
  CheckboxChangeEvent,
  Col,
  Flex,
  Grid,
  Modal,
  Popover,
  Row,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckSquare,
  Camera,
  Clock,
  Copy,
  Info,
  ListRestart,
  MessageSquare,
  Paperclip,
  RectangleEllipsis,
  ShirtIcon,
  TextCursorInput,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Activity from "./activity";
import Cover from "./cover";
import Description from "./description";

const Attachments = dynamic(() => import("./attachments"), {
  ssr: false,
  loading: () => <div>Loading attachments...</div>,
});

import { CardDateDisplay } from "@components/card-dates";
import CollapsibleSection from "@components/collapsible-section";
import ModalDashcardDetail from "@components/modal-dashcard-detail";
import PopoverDates from "@components/popover-dates.tsx";
import PopoverLabel from "@components/popover-label.tsx";
import { ListSelection, SelectionRef } from "@components/selection";
import { useBoardDetails } from "@hooks/board";
import { useCardMutationsOnly } from "@hooks/card";
import { useCardDetails } from "@hooks/card-details";
import { useCardActivity } from "@hooks/card_activity";
import { useCardMembers } from "@hooks/card_member";
import { useLabels } from "@hooks/label";
import { Card, EnumAttachmentType, EnumCardAttachmentType } from "@myTypes/card";
import { CardLabel } from "@myTypes/label";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { selectUser } from "@store/app_slice";
import { selectCurrentBoard } from "@store/workspace_slice";
import { LookupCache } from "@utils/lookup-cache";
import { useParams, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Actions from "./actions";
import BahanFields from "./bahan-fields";
import ChecklistFields from "./checklist-field";
import CustomFields from "./custom-field";
import Dashcard from "./dashcard";
import LocationDisplay from "./location";
import POAmount from "./po-amount";
import POSizeAssignment from "./po-size-assignment";
import ProdukFields from "./produk-fields";
import RequestFields from "./request-field";
import SplitJobFields from "./split-job-field";
import CardTimeInList from "./time-in-lists";
import { uploadFile } from "@api/file";
import { createCardAttachment } from "@api/card_attachment";

const CardDetails: React.FC = (props) => {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  // Boards where the Produk section should be visible (name-based, case-insensitive)
  const ALLOWED_BOARD_NAMES = [
    "Request Desain | Outlet",
    "TEST BOARD",
    "List Purchase | Produksi",
    "Dateline",
  ];
  const CAN_VIEW_BOARD = ["Delivery"];
  // Optional: if you know the exact board IDs, add them here for stronger matching
  const ALLOWED_BOARD_IDS = new Set<string>([
    // e.g. "uuid-1234-...",
  ]);
  // Try to resolve current board name via cache first, then fall back to API
  const cachedBoardName = LookupCache.label("board", boardId as string);
  const { board: currentBoard } = useBoardDetails(
    boardId as string,
    workspaceId as string,
    {
      enabled: !!boardId,
      refetchOnWindowFocus: false,
    }
  );
  const reduxBoard = useSelector(selectCurrentBoard);
  const effectiveBoardName = (
    reduxBoard?.name ||
    ""
  ).trim();
  const viewOnlyBoardNamesSet = new Set(
    CAN_VIEW_BOARD.map((n) => n.toLowerCase().trim())
  );
  const allowedNamesSet = new Set(
    ALLOWED_BOARD_NAMES.map((n) => n.toLowerCase().trim())
  );
  const isViewOnlyProdukBoard =
    !!effectiveBoardName &&
    viewOnlyBoardNamesSet.has(effectiveBoardName.toLowerCase());
  const shouldShowProduk =
    isViewOnlyProdukBoard ||
    (effectiveBoardName &&
      allowedNamesSet.has(effectiveBoardName.toLowerCase())) ||
    (typeof boardId === "string" && ALLOWED_BOARD_IDS.has(boardId));
  const {
    selectedCard,
    setSelectedCard,
    isCardDetailOpen,
    openCardDetail,
    closeCardDetail,
    refetchCardDetails,
    isLoadingCardDetails,
  } = useCardDetailContext();
  const boardName =
    currentBoard?.name ||
    reduxBoard?.name ||
    cachedBoardName ||
    process.env.NEXT_PUBLIC_APP_TITLE ||
    "Ozzy Clothing Production";
  const cardIdQuery = searchParams.get("cardId");
  const listIdQuery = searchParams.get("listId");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const desiredTitle =
      isCardDetailOpen && selectedCard?.name
        ? `${selectedCard.name} | ${boardName}`
        : boardName;

    // Next.js can update <title> after navigation; re-apply on next ticks to win.
    document.title = desiredTitle;
    const t0 = window.setTimeout(() => {
      if (document.title !== desiredTitle) document.title = desiredTitle;
    }, 0);
    const t1 = window.setTimeout(() => {
      if (document.title !== desiredTitle) document.title = desiredTitle;
    }, 80);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [isCardDetailOpen, selectedCard?.name, boardName, cardIdQuery, listIdQuery]);

  useEffect(() => {
    if (!isCardDetailOpen) {
      setIsEditingTitle(false);
      setNewTitle("");
      return;
    }

    // Prevent stale edit state when switching cards
    setIsEditingTitle(false);
    setNewTitle("");
  }, [isCardDetailOpen, selectedCard?.id]);
  const currentUser = useSelector(selectUser);
  const SUPER_ADMIN_ROLE_ID = "f97c942c-5d0c-49c3-b74d-5b149c08634f";
  const userRole = (currentUser?.role?.name || "").trim().toLowerCase();
  const isSuperAdmin = currentUser?.role?.id === SUPER_ADMIN_ROLE_ID;
  const isDatelineBoard =
    effectiveBoardName.toLowerCase() === "dateline" || boardId === "Dateline";
  const roleIn = (roles: string[]) =>
    roles.some((r) => r.toLowerCase() === userRole);
  const canMaterialRequirement =
    isSuperAdmin ||
    (isDatelineBoard && roleIn(["Admin Produksi", "Kepala Produksi"]));
  const canPOSection =
    isSuperAdmin ||
    (isDatelineBoard && roleIn(["Admin Produksi", "Kepala Produksi"]));
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const listSelectionRef = useRef<SelectionRef>(null);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const skipNextTitleBlurSaveRef = useRef(false);
  // Only need mutations; avoid fetching full list data just to update a card
  const { updateCard } = useCardMutationsOnly();
  const {
    cardMembers,
    addMember,
    isAddingMember,
    refetch: refetchMember,
    removeMember,
  } = useCardMembers(selectedCard?.id || "", {
    enabled:
      isCardDetailOpen &&
      !!selectedCard?.id &&
      !(selectedCard?.members && selectedCard.members.length > 0),
  });
  const { cardLabels, allLabels } = useLabels(
    workspaceId as string,
    selectedCard?.id,
    undefined,
    {
      enabled:
        isCardDetailOpen &&
        !!selectedCard?.id &&
        !(selectedCard?.labels && selectedCard.labels.length > 0),
    }
  );
  const { cardActivities } = useCardActivity(selectedCard?.id || "", {
    enabled: isCardDetailOpen && !!selectedCard?.id,
  });
  const effectiveMembers = useMemo(
    () =>
      selectedCard?.members && selectedCard.members.length > 0
        ? selectedCard.members
        : cardMembers || [],
    [selectedCard?.members, cardMembers]
  );
  const effectiveLabels = useMemo(
    () =>
      selectedCard?.labels && selectedCard.labels.length > 0
        ? (selectedCard.labels as CardLabel[])
        : (cardLabels as CardLabel[]) || [],
    [selectedCard?.labels, cardLabels]
  );
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [openLabel, setOpenLabel] = useState<boolean>(false);
  const [openDates, setOpenDates] = useState<boolean>(false);
  const {
    completeCard,
    incompleteCard,
    updateCard: updateCardDetails,
  } = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string,
    {
      enabled: isCardDetailOpen && !!selectedCard?.id,
    }
  );

  // Get board permissions
  const { canUpdateCard, canManageCardAttachments } = useBoardPermissionsContext();
  const [dashcardModalCard, setDashcardModalCard] = useState<Card | null>(null);
  const [isDashcardModalOpen, setIsDashcardModalOpen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [quickUploadLoading, setQuickUploadLoading] = useState<
    "camera" | null
  >(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null); // fallback for older browsers
  const screens = Grid.useBreakpoint();
  const isDesktop = !!screens.md;
  const handleOpenDashcardDetail = useCallback((card: Card) => {
    setDashcardModalCard(card);
    setIsDashcardModalOpen(true);
  }, []);

  useEffect(() => {
    if (!selectedCard) {
      setIsDashcardModalOpen(false);
      setDashcardModalCard(null);
      return;
    }

    if (selectedCard.type === "dashcard") {
      setDashcardModalCard(selectedCard);
      setIsDashcardModalOpen(true);
    } else {
      setIsDashcardModalOpen(false);
      setDashcardModalCard(null);
    }
  }, [selectedCard]);

  useEffect(() => {
    if (isDesktop) {
      setIsActionsPopoverOpen(false);
    }
  }, [isDesktop]);

  const onCompletionChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    if (!canUpdateCard()) {
      return;
    }
    const isComplete = e.target.checked;
    if (isComplete) {
      completeCard({
        listId: selectedCard?.listId || "",
        cardId: selectedCard?.id || "",
      });
    } else {
      incompleteCard({
        listId: selectedCard?.listId || "",
        cardId: selectedCard?.id || "",
      });
    }
  };

  const handleFilesUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !selectedCard?.id) return;
      setIsUploadingDrop(true);
      try {
        for (const file of Array.from(files)) {
          const res = await uploadFile(file, { cardId: selectedCard.id });
          const uploaded = res?.data;
          if (uploaded?.id) {
            await createCardAttachment({
              cardId: selectedCard.id,
              attachableType: EnumAttachmentType.File,
              attachableId: uploaded.id,
              isCover: false,
              type: EnumCardAttachmentType.Attachment,
            });
          }
        }
        message.success("File(s) uploaded");
      } catch (err: any) {
        console.error("Drag/drop upload failed", err);
        message.error(err?.message || "Upload failed");
      } finally {
        setIsUploadingDrop(false);
      }
    },
    [selectedCard?.id]
  );

  const handleQuickUpload = useCallback(
    async (file: File) => {
      if (!selectedCard?.id) return;
      setQuickUploadLoading("camera");
      const toastKey = `quick-upload-camera`;
      message.loading({
        key: toastKey,
        content: "Uploading attachment...",
        duration: 0,
      });
      try {
        const res = await uploadFile(file, { cardId: selectedCard.id });
        const uploaded = res?.data;
        if (uploaded?.id) {
          await createCardAttachment({
            cardId: selectedCard.id,
            attachableType: EnumAttachmentType.File,
            attachableId: uploaded.id,
            isCover: false,
            type: EnumCardAttachmentType.Attachment,
          });
        }
        message.success({ key: toastKey, content: "Uploaded" });
        refetchCardDetails?.();
      } catch (err: any) {
        message.error({
          key: toastKey,
          content: err?.message || "Upload failed",
        });
      } finally {
        setQuickUploadLoading(null);
      }
    },
    [refetchCardDetails, selectedCard?.id]
  );

  const stopCameraStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      (videoRef.current as any).srcObject = null;
    }
  }, []);

  const openCamera = useCallback(async () => {
    if (quickUploadLoading) return;
    if (typeof navigator === "undefined") return;

    const media = (navigator as any).mediaDevices;
    if (!media?.getUserMedia) {
      // Fallback: may show chooser (device dependent)
      cameraInputRef.current?.click();
      return;
    }

    try {
      setIsCameraModalOpen(true);
      const stream: MediaStream = await media.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        (videoRef.current as any).srcObject = stream;
        await videoRef.current.play?.();
      }
    } catch (err: any) {
      setIsCameraModalOpen(false);
      message.error(err?.message || "Failed to open camera");
    }
  }, [quickUploadLoading]);

  const captureAndUpload = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (!width || !height) {
      message.error("Camera not ready");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      message.error("Failed to capture image");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) {
      message.error("Failed to capture image");
      return;
    }

    const filename = `camera-${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: "image/jpeg" });
    stopCameraStream();
    setIsCameraModalOpen(false);
    void handleQuickUpload(file);
  }, [handleQuickUpload, stopCameraStream]);

  useEffect(() => {
    if (!isCameraModalOpen) {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [isCameraModalOpen, stopCameraStream]);

  useEffect(() => {
    if (!isCardDetailOpen) {
      setIsDraggingFiles(false);
      return;
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingFiles(false);
      const dt = e.dataTransfer;
      if (dt?.files?.length) {
        const fileCount = dt.files.length;
        message.loading({
          content: `Uploading ${fileCount} file${fileCount > 1 ? "s" : ""}...`,
          key: "drag-upload",
          duration: 0,
        });
        void handleFilesUpload(dt.files).finally(() => {
          message.destroy("drag-upload");
        });
      }
    };

    // Handle paste for file attachments
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore paste if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInputElement) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData?.files?.length) {
        return;
      }

      e.preventDefault();
      const fileCount = clipboardData.files.length;
      message.loading({
        content: `Uploading ${fileCount} file${fileCount > 1 ? "s" : ""}...`,
        key: "paste-upload",
        duration: 0,
      });
      void handleFilesUpload(clipboardData.files).finally(() => {
        message.destroy("paste-upload");
      });
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleFilesUpload, isCardDetailOpen]);

  const handleSaveTitleClick = () => {
    if (!selectedCard) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setNewTitle(selectedCard.name || "");
      setIsEditingTitle(false);
      return;
    }
    if ((selectedCard.name || "").trim() === trimmed) {
      setIsEditingTitle(false);
      return;
    }
    updateCard(
      {
        cardId: selectedCard.id,
        updates: {
          name: trimmed,
        },
      },
      {
        onSuccess: (data) => {
          if (setSelectedCard) {
            setSelectedCard((prevCard) => {
              if (!prevCard) return prevCard;
              return {
                ...prevCard,
                name: trimmed,
              };
            });
          }
          setIsEditingTitle(false);
        },
        onError: (error) => {
          // Title update failed
        },
      }
    );
  };

  const copyCardName = async () => {
    const text = (selectedCard?.name || "").toString();
    if (!text.trim()) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("Copied");
    } catch (err) {
      message.error("Copy failed");
    }
  };

  const onListChange = (value: string, option: object) => {
    if (!canUpdateCard()) {
      return;
    }
    if (selectedCard) {
      const result = updateCard({
        cardId: selectedCard?.id,
        updates: {
          listId: value,
        },
        listId: selectedCard?.listId,
        destinationListId: value,
      });
    }
  };

  const onUserSelectionChange = (value: string, option: object) => {
    if (!canUpdateCard()) {
      return;
    }
    addMember(value);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!canUpdateCard()) {
      return;
    }
    removeMember(memberId);
  };

  useEffect(() => {
    if (isAddingMember) {
      refetchMember();
    }
  }, [isAddingMember]);

  // Populate LookupCache with labels data
  useEffect(() => {
    if (allLabels && allLabels.length > 0) {
      LookupCache.rememberMany(
        "label",
        allLabels.map((label: any) => ({
          id: label.id,
          name: label.name,
        }))
      );
    }
  }, [allLabels]);

  // Keyboard shortcut: open Label popover with "L" when card detail is focused and not typing
  useEffect(() => {
    if (!isCardDetailOpen) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement as HTMLElement | null;
        const tag = active?.tagName?.toLowerCase();
        const isTyping =
          active &&
          (active.isContentEditable ||
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            tag === "button");

        if (!isTyping) {
          e.preventDefault();
          setOpenLabel((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isCardDetailOpen]);

  const actionList = (
    <div className="max-h-[70vh] overflow-y-auto">
      <Actions
        boardName={effectiveBoardName}
        userRole={userRole}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );

  const headerBlock = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="relative flex items-center gap-2 min-w-0">
        <Checkbox
          className={`custom-circular-checkbox absolute left-0 -ml-6 transition-all duration-300 
                    ${selectedCard?.isComplete ? "completed" : ""} ${!canUpdateCard() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          checked={selectedCard?.isComplete}
          disabled={!canUpdateCard()}
          onChange={(e) => {
            onCompletionChange(e);
          }}
          onClick={(e) => e.stopPropagation()}
        />
	        <div className="flex-1 min-w-0">
	          {isEditingTitle ? (
	            <div className="flex items-start gap-1">
	              <input
	                type="text"
	                value={newTitle}
	                onChange={(e) => setNewTitle(e.target.value)}
	                onBlur={() => {
	                  if (skipNextTitleBlurSaveRef.current) {
	                    skipNextTitleBlurSaveRef.current = false;
	                    return;
	                  }
	                  handleSaveTitleClick();
	                }}
	                autoFocus
	                className="font-bold mb-0 ml-2 px-2 py-1 w-full border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
	                onKeyDown={(e) => {
	                  if (e.key === "Enter") {
	                    e.preventDefault();
	                    e.stopPropagation();
	                    skipNextTitleBlurSaveRef.current = true;
	                    handleSaveTitleClick();
	                  } else if (e.key === "Escape") {
	                    setNewTitle(selectedCard?.name || "");
	                    setIsEditingTitle(false);
	                  }
	                }}
	              />
	              <Tooltip title="Copy name">
	                <button
	                  type="button"
	                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
	                  onMouseDown={(e) => e.preventDefault()}
	                  onClick={(e) => {
	                    e.stopPropagation();
	                    void copyCardName();
	                  }}
	                  aria-label="Copy card name"
	                >
	                  <Copy size={16} />
	                </button>
	              </Tooltip>
	            </div>
	          ) : (
	            <div className="flex items-start gap-1 min-w-0">
	              <h1
	                className={`text-5xl font-bold mb-0 ml-2 px-2 py-1 rounded-md break-words min-w-0 ${canUpdateCard()
	                  ? "cursor-pointer hover:bg-gray-50"
	                  : "cursor-not-allowed opacity-60"
	                  }`}
	                onClick={() => {
	                  if (canUpdateCard()) {
	                    setNewTitle(selectedCard?.name || "");
	                    setIsEditingTitle(true);
	                  }
	                }}
	              >
	                {selectedCard?.name}
	              </h1>
	              <Tooltip title="Copy name">
	                <button
	                  type="button"
	                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 mt-1"
	                  onMouseDown={(e) => e.preventDefault()}
	                  onClick={(e) => {
	                    e.stopPropagation();
	                    void copyCardName();
	                  }}
	                  aria-label="Copy card name"
	                >
	                  <Copy size={16} />
	                </button>
	              </Tooltip>
	            </div>
	          )}
	        </div>
      </div>
      {!isDesktop &&
        (
          <div className="flex items-center gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void handleQuickUpload(file);
              }}
            />

            <Tooltip
              title={
                canManageCardAttachments()
                  ? "Open camera"
                  : "You don't have permission"
              }
            >
              <Button
                size="small"
                type="default"
                loading={quickUploadLoading === "camera"}
                disabled={
                  !canManageCardAttachments() || quickUploadLoading !== null
                }
                icon={<Camera size={16} />}
                onClick={() => {
                  if (!canManageCardAttachments()) return;
                  void openCamera();
                }}
              />
            </Tooltip>

            <Popover
              open={isActionsPopoverOpen}
              onOpenChange={setIsActionsPopoverOpen}
              trigger="click"
              placement="bottomRight"
              overlayStyle={{ width: 360 }}
              content={actionList}
            >
              <Button
                size="small"
                className="flex items-center gap-2 px-3 py-1 rounded-md"
                type="default"
              >
                <RectangleEllipsis size={16} />
                <span className="text-sm font-semibold">Actions</span>
              </Button>
            </Popover>

            <Modal
              open={isCameraModalOpen}
              onCancel={() => {
                setIsCameraModalOpen(false);
                stopCameraStream();
              }}
              footer={[
                <Button
                  key="cancel"
                  onClick={() => {
                    setIsCameraModalOpen(false);
                    stopCameraStream();
                  }}
                >
                  Cancel
                </Button>,
                <Button
                  key="capture"
                  type="primary"
                  onClick={() => void captureAndUpload()}
                >
                  Capture
                </Button>,
              ]}
              title="Camera"
              width={420}
              styles={{ body: { padding: 0 } }}
              destroyOnClose
            >
              <div className="w-full bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
              </div>
            </Modal>
          </div>
        )}
    </div>
  );

  const mainBody = (
    <div className="space-y-3 md:ml-8">
      <div className="flex items-center space-x-2">
        {/* List Section */}
        <div>
          <span className="text-gray-500 text-sm mr-2">in list</span>
          <ListSelection
            ref={listSelectionRef}
            size="small"
            width={"fit-content"}
            value={selectedCard?.listId}
            onChange={onListChange}
            disabled={true}
          />
        </div>

        {/* <Button
          icon={<Eye size={14} />}
          size="small"
          className="rounded-md hover:bg-gray-50"
        /> */}
      </div>

      <Flex wrap gap="middle">
        {/* Members */}
        <div className="space-y-2 text-xs">
          <span className="text-gray-300 font-semibold text-xs block">
            Members
          </span>
          <div>
            <MembersList
              members={effectiveMembers}
              membersLength={effectiveMembers?.length || 0}
              membersLoopLimit={3}
              openAddMember={openAddMember && canUpdateCard()}
              setOpenAddMember={setOpenAddMember}
              onUserSelectionChange={onUserSelectionChange}
              onRemoveMember={handleRemoveMember}
            />
          </div>
        </div>

        {/* Labels */}
        <div className="space-y-2 text-xs">
          <span className="text-gray-300 font-semibold text-xs block">
            Labels
          </span>
          <div className="flex gap-1">
            {effectiveLabels?.map((label: CardLabel, index: number) => (
              <Tooltip
                title={`color: ${label.value}, title: ${label.name}`}
                key={index}
              >
                <Tag color={label.value} className="rounded-md">
                  {label?.name}
                </Tag>
              </Tooltip>
            ))}

            <PopoverLabel
              open={openLabel}
              setOpen={setOpenLabel}
              triggerEl={
                <Tag className="cursor-pointer rounded-md border-dashed hover:bg-gray-50">
                  +
                </Tag>
              }
            />
          </div>
        </div>

        {/* Notifications & Watch */}
        {/* <div className="space-y-2 text-xs">
          <span className="text-gray-300 font-semibold text-xs block">
            Notifications
          </span>
          <Button
            icon={<Eye size={14} />}
            size="small"
            className="rounded-md hover:bg-gray-50"
          >
            Watch
          </Button>
        </div> */}

        {/* Time in List */}
        <div className="space-y-2 text-xs">
          <span className="text-gray-300 font-semibold text-xs block">
            Time in List
          </span>
          <Button size="small" className="rounded-md hover:bg-gray-50">
            {selectedCard?.timeInLists?.find(
              (item) => item.listId == selectedCard.listId
            )?.formattedTimeInList || "0m"}
          </Button>
        </div>

        {/* Time on Board */}
        <div className="space-y-2 text-xs">
          <span className="text-gray-300 font-semibold text-xs block">
            Time on Board
          </span>
          <Button size="small" className="rounded-md hover:bg-gray-50">
            {selectedCard?.formattedTimeInBoard || "0m"}
          </Button>
        </div>

        {/* Start and Due Dates */}
        {selectedCard && (
          <div className="space-y-2 text-xs">
            <span className="text-gray-300 font-semibold text-xs block">
              Dates
            </span>
            <PopoverDates
              open={openDates}
              setOpen={setOpenDates}
              triggerEl={
                <Button
                  icon={<Clock size={12} />}
                  size="small"
                  className="rounded-md hover:bg-gray-50"
                >
                  <CardDateDisplay card={selectedCard} />
                </Button>
              }
            />
          </div>
        )}

        {selectedCard && canMaterialRequirement && (
          <div className="space-y-2 text-xs">
            <span className="text-gray-300 font-semibold text-xs block">
              Material Requirements
            </span>
            <Checkbox
              checked={selectedCard.bahan || false}
              onChange={(e: CheckboxChangeEvent) => {
                if (!canUpdateCard()) return;

                const newBahanValue = e.target.checked;

                // Update local state immediately for better UX
                const updatedCard = {
                  ...selectedCard,
                  bahan: newBahanValue,
                };
                setSelectedCard(updatedCard);
                updateCardDetails({ bahan: newBahanValue });
              }}
              className="text-sm"
            >
              Butuh Bahan
            </Checkbox>
          </div>
        )}

        {selectedCard && canPOSection && (
          <POAmount card={selectedCard} setSelectedCard={setSelectedCard} />
        )}

        {selectedCard && canPOSection && (
          <POSizeAssignment
            card={selectedCard}
            setSelectedCard={setSelectedCard}
          />
        )}
      </Flex>

      {selectedCard && (
        <Description
          card={selectedCard}
          setSelectedCard={setSelectedCard}
        />
      )}

      {selectedCard && shouldShowProduk && selectedCard?.type !== "dashcard" && (
        <CollapsibleSection
          title="Produk"
          defaultExpanded={true}
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 1v6m6-6v6" />
            </svg>
          }
        >
          <ProdukFields
            card={selectedCard}
            setCard={setSelectedCard}
            viewOnly={isViewOnlyProdukBoard}
          />
        </CollapsibleSection>
      )}

      {selectedCard &&
        selectedCard?.location &&
        selectedCard?.location != "" &&
        selectedCard?.type !== "dashcard" && (
          <LocationDisplay coordinate={selectedCard?.location} />
        )}

      {selectedCard && selectedCard?.type !== "dashcard" && (
        <CollapsibleSection
          title="Custom Fields"
          defaultExpanded={true}
          icon={<TextCursorInput size={18} />}
        >
          <CustomFields
            card={selectedCard}
            setCard={setSelectedCard}
            isSuperAdmin={isSuperAdmin}
          />
        </CollapsibleSection>
      )}

      {selectedCard?.type == "dashcard" && (
        <Dashcard
          card={selectedCard}
          onOpenDetail={handleOpenDashcardDetail}
        />
      )}
      {/* 
      {selectedCard?.id && (
        <AdditionalFields cardId={selectedCard.id} />
      )} */}

      {selectedCard?.bahan && (
        <CollapsibleSection
          title="Bahan Fields"
          defaultExpanded={false}
          icon={<ShirtIcon size={18} />}
        >
          <BahanFields
            cardId={selectedCard?.id || ""}
            workspaceId={workspaceId}
          />
        </CollapsibleSection>
      )}

      {selectedCard && selectedCard?.type !== "dashcard" && (
        <CollapsibleSection
          title="Request Fields"
          defaultExpanded={false}
          icon={
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 4L4 20h16L12 4z" />
            </svg>
          }
        >
          <RequestFields />
        </CollapsibleSection>
      )}

      {selectedCard && (
        <CollapsibleSection
          title="Time in Lists"
          defaultExpanded={false}
          icon={<ListRestart size={18} />}
        >
          <CardTimeInList card={selectedCard} setCard={setSelectedCard} />
        </CollapsibleSection>
      )}

      {selectedCard && selectedCard?.type !== "dashcard" && (
        <CollapsibleSection
          title="Split Job Fields"
          defaultExpanded={false}
          icon={<CheckSquare size={18} />}
        >
          <SplitJobFields card={selectedCard} setCard={setSelectedCard} />
        </CollapsibleSection>
      )}

      {selectedCard && selectedCard?.type !== "dashcard" && (
        <CollapsibleSection
          title="Checklist"
          defaultExpanded={true}
          icon={<CheckSquare size={18} />}
        >
          <ChecklistFields />
        </CollapsibleSection>
      )}

      {selectedCard && (
        <CollapsibleSection
          title="Attachments"
          defaultExpanded={true}
          icon={<Paperclip size={18} />}
        >
          <Attachments
            card={selectedCard}
            setCard={setSelectedCard}
            currentUser={currentUser}
          />
        </CollapsibleSection>
      )}

      {selectedCard && (
        <CollapsibleSection
          title="Activity"
          defaultExpanded={true}
          icon={<MessageSquare size={18} />}
        >
          <Activity
            currentUser={currentUser}
            card={selectedCard}
            setCard={setSelectedCard}
          />
        </CollapsibleSection>
      )}
    </div>
  );

  return (
    <Modal
      title={null}
      open={isCardDetailOpen}
      onCancel={closeCardDetail}
      footer={null}
      className="modal-card-form full-height-modal"
      width="min(1050px, 95vw)"
      destroyOnClose
    >
      <div className="overflow-x-hidden max-w-full relative">
        {isDraggingFiles && (
          <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
            <div className="bg-white px-4 py-2 rounded shadow text-blue-700 font-semibold">
              {isUploadingDrop ? "Uploading..." : "Drop files to attach"}
            </div>
          </div>
        )}
        {/* Cover Image Section */}
        {selectedCard && <Cover card={selectedCard} />}

        {selectedCard && selectedCard?.mirrorId && (
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2 rounded-md border border-gray-200 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Info size={20} className="text-yellow-600" />
              <span>
                You are viewing this card outside of its original location
              </span>
            </div>
            <Button
              size="small"
              className="bg-gray-200 text-blue-800 font-medium hover:bg-gray-300 border-none rounded-sm px-3 py-1"
            >
              Remove from this board
            </Button>
          </div>
        )}

        {/* Archived badge */}
        {selectedCard?.archive && (
          <div className="w-full bg-red-100 text-red-800 px-4 py-3 rounded-md text-center font-bold text-base mb-4 border border-red-200 shadow">
            This card is archived
          </div>
        )}

        <div className="p-5">
          {isDesktop ? (
            <Row gutter={[32, 32]}>
              <Col xs={24} lg={18}>
                <div className="space-y-4">
                  {headerBlock}
                  {mainBody}
                </div>
              </Col>
              <Col xs={24} lg={6}>
                <div className="pl-4 lg:pl-0">
                  <Typography.Title
                    level={5}
                    className="m-0 mb-2 text-gray-700"
                  >
                    Actions
                  </Typography.Title>
                  {actionList}
                </div>
              </Col>
            </Row>
          ) : (
            <div className="space-y-4">
              {headerBlock}
              {mainBody}
            </div>
          )}
        </div>
        <ModalDashcardDetail
          open={isDashcardModalOpen}
          setOpen={setIsDashcardModalOpen}
          card={dashcardModalCard}
        />
      </div>
    </Modal>
  );
};

export default CardDetails;
