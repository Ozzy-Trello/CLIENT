import React, {
  ReactNode,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Dropdown, MenuProps, Modal, message } from "antd";
import TouchAwareTooltip from "@components/touch-aware-tooltip";
import { MoveRight, Copy, Trash2, Tag, ListPlus } from "lucide-react";
import PopoverMoveCard from "@components/popover-move-card";
import PopoverCopyCard from "@components/popover-copy-card";
import PopoverLabel from "@components/popover-label.tsx";
import { Card } from "@myTypes/card";
import { AnyList } from "@myTypes/list";
import { useCards } from "@hooks/card";
import { useParams } from "next/navigation";
import { usePermissions } from "@hooks/account";
import CreateSubcardModal from "@components/modal-create-subcard";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

interface CardContextMenuProps {
  children: ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  card?: Card;
  list?: AnyList;
}

const CardContextMenu: React.FC<CardContextMenuProps> = ({
  children,
  onContextMenu,
  card,
  list,
}) => {
  const { boardId } = useParams();
  const [openMoveCard, setOpenMoveCard] = useState(false);
  const [openCopyCard, setOpenCopyCard] = useState(false);
  const [openLabel, setOpenLabel] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [openSubcardModal, setOpenSubcardModal] = useState(false);



  // Create refs for the trigger elements
  const moveButtonRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLDivElement>(null);

  // Get delete card function from useCards hook
  const { deleteCard, isDeletingCard } = useCards(
    list?.id || "",
    boardId as string
  );

  // Get permissions
  const { canMoveCard, canCopyCard, canDeleteCard, canManageCardLabels } =
    usePermissions();
  const { canCreateCard } = useBoardPermissionsContext();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);

    if (onContextMenu) {
      onContextMenu(e);
    }
  };



  const handleDeleteCard = useCallback(() => {
    if (!card || !list) return;

    Modal.confirm({
      title: "Delete Card",
      content: (
        <div className="py-4 px-4">
          <p className="mb-0">
            Are you sure you want to delete <strong>"{card.name}"</strong>?
          </p>
          <p className="mb-0 text-gray-600 mt-2">
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      width: 450,
      styles: {
        body: {
          padding: "1rem",
        },
      },
      centered: true,
      onOk: () => {
        deleteCard({ cardId: card.id, listId: list.id });
        message.success("Card deleted successfully!");
      },
    });
  }, [card, list, deleteCard]);

  const handleMenuClick = useCallback(
    (key: string) => {
      // Close context menu first
      setContextMenuVisible(false);

      // Use setTimeout to ensure dropdown is closed before opening popover
      setTimeout(() => {
        if (key === "move") {
          setOpenMoveCard(true);
        } else if (key === "copy") {
          setOpenCopyCard(true);
        } else if (key === "labels") {
          setOpenLabel(true);
        } else if (key === "delete") {
          handleDeleteCard();
        } else if (key === "subcard") {
          setOpenSubcardModal(true);
        }
      }, 100);
    },
    [handleDeleteCard]
  );

  // Helper function to create menu item with permission check
  const createMenuItem = useMemo(
    () =>
      (
        key: string,
        icon: React.ReactNode,
        label: string,
        canPerform: boolean,
        onClick: () => void,
        className?: string,
        disabled?: boolean
      ) => {
        const isDisabled = disabled || !canPerform;
        const content = (
          <div
            className={`flex items-center gap-2 px-2 py-1 ${className || ""} ${
              isDisabled ? "opacity-50" : ""
            }`}
          >
            {icon}
            <span>{label}</span>
          </div>
        );

        return {
          key,
          label: canPerform ? (
            content
          ) : (
            <TouchAwareTooltip
              title="Insufficient permissions"
              placement="right"
            >
              {content}
            </TouchAwareTooltip>
          ),
          onClick: canPerform ? onClick : undefined,
          disabled: isDisabled,
        };
      },
    []
  );

  const items: MenuProps["items"] = useMemo(
    () => [
      createMenuItem(
        "move",
        <MoveRight size={14} />,
        "Move Card",
        canMoveCard(),
        () => handleMenuClick("move")
      ),
      createMenuItem(
        "copy",
        <Copy size={14} />,
        "Copy Card",
        canCopyCard(),
        () => handleMenuClick("copy")
      ),
      createMenuItem(
        "labels",
        <Tag size={14} />,
        "Labels",
        canManageCardLabels(),
        () => handleMenuClick("labels")
      ),
      createMenuItem(
        "subcard",
        <ListPlus size={14} />,
        "Create Sub Card",
        !!card && !!list && canCreateCard(),
        () => handleMenuClick("subcard")
      ),
      {
        type: "divider" as const,
      },
      createMenuItem(
        "delete",
        <Trash2 size={14} />,
        "Delete Card",
        canDeleteCard(),
        () => handleMenuClick("delete"),
        "text-red-600",
        isDeletingCard
      ),
    ],
    [
      createMenuItem,
      canMoveCard,
      canCopyCard,
      canDeleteCard,
      isDeletingCard,
      handleMenuClick,
    ]
  );

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuVisible(false);
    };

    if (contextMenuVisible) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenuVisible]);

  // Add ref for the wrapper div
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Right-click context menu support will be handled via onContextMenu on the wrapper div.

  // Keyboard shortcut: Press 'L' to open Labels when context menu is visible
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!contextMenuVisible) return;
      const target = e.target as HTMLElement | null;
      // Skip if typing in input/textarea/contenteditable
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((e.key === "l" || e.key === "L") && canManageCardLabels()) {
        e.preventDefault();
        setContextMenuVisible(false);
        setTimeout(() => setOpenLabel(true), 100);
      }
    };

    if (contextMenuVisible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [contextMenuVisible, canManageCardLabels]);



  return (
    <>
      <Dropdown
        menu={{ items }}
        trigger={[]}
        open={contextMenuVisible}
        onOpenChange={setContextMenuVisible}
        overlayStyle={{
          position: "fixed",
          left: contextMenuPosition.x,
          top: contextMenuPosition.y,
        }}
      >
        <div ref={wrapperRef} onContextMenu={handleContextMenu}>
          {children}
        </div>
      </Dropdown>

      {/* Move Card Popover */}
      <PopoverMoveCard
        open={openMoveCard}
        setOpen={setOpenMoveCard}
        card={card}
        list={list}
        triggerEl={
          <div
            style={{
              position: "fixed",
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        }
      />

      {/* Copy Card Popover */}
      <PopoverCopyCard
        open={openCopyCard}
        setOpen={setOpenCopyCard}
        card={card}
        list={list}
        triggerEl={
          <div
            style={{
              position: "fixed",
              left: contextMenuPosition.x,
              top: contextMenuPosition.y + 30,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        }
      />

      {/* Labels Popover */}
      <PopoverLabel
        open={openLabel}
        setOpen={setOpenLabel}
        card={card}
        triggerEl={
          <div
            style={{
              position: "fixed",
              left: contextMenuPosition.x,
              top: contextMenuPosition.y + 60,
              width: 1,
              height: 1,
              pointerEvents: "none",
            }}
          />
        }
      />

      <CreateSubcardModal
        parentCard={card || null}
        open={openSubcardModal}
        onClose={() => setOpenSubcardModal(false)}
      />
    </>
  );
};

export default CardContextMenu;
