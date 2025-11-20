import { searchCards, updateCard } from "@api/card";
import PopoverAttach from "@components/popover-attach";
import PopoverChecklist from "@components/popover-checklist";
import PopoverCopyCard from "@components/popover-copy-card";
import PopoverCustomField from "@components/popover-custom-field";
import PopoverDates from "@components/popover-dates.tsx";
import PopoverLabel from "@components/popover-label.tsx";
import PopoverMirrorCard from "@components/popover-mirror-card";
import PopoverMoveCard from "@components/popover-move-card";
import PopoverUser from "@components/popover-user";
import { useCurrentAccount, usePermissions } from "@hooks/account";
import { useCards } from "@hooks/card";
import { useCardDetails } from "@hooks/card-details";
import { useCardAttachment } from "@hooks/card_attachment";
import { useCardMembers } from "@hooks/card_member";
import { useCreateSubcard } from "@hooks/subcard";
import {
  Card,
  EnumAttachmentType,
  EnumCardAttachmentType,
} from "@myTypes/card";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { useCardDetailContext } from "@providers/card-detail-context";
import { selectIsDarkMode, selectTheme } from "@store/app_slice";
import {
  Input,
  List,
  message,
  Modal,
  Select,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import {
  Archive,
  CheckSquare,
  Clock,
  Copy,
  FlipHorizontal,
  GitBranch,
  Link,
  MoveRight,
  Paperclip,
  RectangleEllipsis,
  RotateCcw,
  Share2,
  Tag,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AutomateButtons from "./automate-buttons";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants/query-keys";

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

type RelationshipType = "link" | "subcard" | "subcard_existing";

const Actions: React.FC = () => {
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
  const [openRelationshipModal, setOpenRelationshipModal] = useState(false);
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("link");
  const [relationshipName, setRelationshipName] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [selectedRelationshipCard, setSelectedRelationshipCard] =
    useState<Card | null>(null);
  const [isSearchingRelationship, setIsSearchingRelationship] = useState(false);
  const [isSubmittingRelationship, setIsSubmittingRelationship] =
    useState(false);

  const { boardId } = useParams();
  const queryClient = useQueryClient();
  const { selectedCard } = useCardDetailContext();
  const selectedCardListId =
    selectedCard?.listId || (selectedCard as any)?.list_id || "";
  const { addAttachment } = useCardAttachment(selectedCard?.id || "", {
    listId: selectedCardListId,
    boardId: boardId as string,
  });
  const { mutateAsync: createSubcard } = useCreateSubcard();

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
    canCreateCard,
    canArchiveCard,
    canDeleteCard,
    canShareCard,
  } = useBoardPermissionsContext();

  // Keep global permissions for observer status
  const { isObserver } = usePermissions();
  const permissionLevel = "BOARD_SPECIFIC"; // Use board-specific permissions

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

  const canAddRelationship =
    !!selectedCard && (canManageCardAttachments() || canCreateCard());

  const handleRelationshipSearch = async () => {
    const query = relationshipName.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    setIsSearchingRelationship(true);
    try {
      const { data: results } = await searchCards({
        name: query,
        description: query,
      });
      const filtered = (results || []).filter(
        (item) => item?.id && item?.id !== selectedCard?.id
      );
      setSearchResults(filtered);
      if (filtered.length > 0) {
        setSelectedRelationshipCard(null);
      }
    } catch (error) {
      console.error("Relationship search failed", error);
      message.error("Failed to search cards");
    } finally {
      setIsSearchingRelationship(false);
    }
  };

  const resetRelationshipState = () => {
    setRelationshipName("");
    setSearchResults([]);
    setSelectedRelationshipCard(null);
  };

  useEffect(() => {
    if (!openRelationshipModal) {
      resetRelationshipState();
    }
  }, [openRelationshipModal]);

  useEffect(() => {
    if (relationshipType === "subcard") {
      setSearchResults([]);
      setSelectedRelationshipCard(null);
    }
  }, [relationshipType]);

  const handleAddRelationship = async () => {
    if (!selectedCard) return;

    if (relationshipType === "subcard" && !relationshipName.trim()) {
      message.warning("Subcard title is required");
      return;
    }

    if (
      (relationshipType === "link" ||
        relationshipType === "subcard_existing") &&
      !selectedRelationshipCard
    ) {
      message.warning("Select a card to link");
      return;
    }

    setIsSubmittingRelationship(true);
    try {
      if (relationshipType === "subcard") {
        await createSubcard({
          parentCard: selectedCard,
          name: relationshipName.trim(),
        });
        message.success("Subcard created");
      } else if (relationshipType === "link") {
        addAttachment({
          cardId: selectedCard.id,
          attachableType: EnumAttachmentType.Card,
          attachableId: selectedRelationshipCard!.id,
          isCover: false,
          type: EnumCardAttachmentType.Attachment,
        });
        message.success("Relationship added");
      } else if (relationshipType === "subcard_existing") {
        await updateCard(selectedRelationshipCard!.id, {
          parentId: selectedCard.id,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(selectedCard.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.cards.detail(selectedRelationshipCard!.id),
        });
        message.success("Card linked as subcard");
      }
      setOpenRelationshipModal(false);
    } catch (error) {
      console.error("Failed to add relationship", error);
      message.error("Failed to add relationship");
    } finally {
      setIsSubmittingRelationship(false);
    }
  };

  // Check if current user is a member
  const isCurrentUserMember = currentUser?.id
    ? isMember(currentUser.id)
    : false;

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
    <>
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
          .filter(
            (item) => item.label !== "Checklist" && item.label !== "Labels"
          )
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

        <PermissionButton
          canPerform={canAddRelationship}
          tooltip="Link another card or create a subcard"
          permissionLevel={permissionLevel}
          buttonStyle={buttonStyle}
          onClick={() => setOpenRelationshipModal(true)}
        >
          <span className="text-xs" style={iconStyle}>
            <GitBranch size={14} />
          </span>
          <span className="text-xs">Add relationship</span>
        </PermissionButton>

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
          {/* {canMirrorCard() ? (
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
          )} */}

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
        </div>
        <Modal
          open={openRelationshipModal}
          title={
            relationshipType === "link"
              ? "Link another card"
              : relationshipType === "subcard"
              ? "Create a subcard"
              : "Make existing card a subcard"
          }
          onCancel={() => setOpenRelationshipModal(false)}
          onOk={handleAddRelationship}
          okText={
            relationshipType === "link"
              ? "Link card"
              : relationshipType === "subcard"
              ? "Create subcard"
              : "Link as subcard"
          }
          confirmLoading={isSubmittingRelationship}
          destroyOnClose
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <Typography.Text className="text-xs font-semibold text-gray-600">
                Relationship type
              </Typography.Text>
              <Select
                options={[
                  { label: "Link existing card", value: "link" },
                  { label: "Create subcard", value: "subcard" },
                  {
                    label: "Make existing card a subcard",
                    value: "subcard_existing",
                  },
                ]}
                value={relationshipType}
                size="small"
                onChange={(value) =>
                  setRelationshipType(value as RelationshipType)
                }
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Typography.Text className="text-xs font-semibold text-gray-600">
                {relationshipType === "link"
                  ? "Search existing card"
                  : relationshipType === "subcard"
                  ? "Subcard title"
                  : "Search card to convert"}
              </Typography.Text>
              {relationshipType === "link" ||
              relationshipType === "subcard_existing" ? (
                <Input.Search
                  value={relationshipName}
                  placeholder="Type to search matching cards"
                  onChange={(e) => setRelationshipName(e.target.value)}
                  onSearch={handleRelationshipSearch}
                  enterButton="Search"
                  loading={isSearchingRelationship}
                  allowClear
                />
              ) : (
                <Input
                  value={relationshipName}
                  placeholder="Enter title for the new subcard"
                  onChange={(e) => setRelationshipName(e.target.value)}
                  allowClear
                />
              )}
            </div>

            {(relationshipType === "link" ||
              relationshipType === "subcard_existing") && (
              <div className="space-y-2">
                <Typography.Text
                  type="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <Link size={12} />
                  {relationshipType === "link"
                    ? "Select a card to link"
                    : "Select a card to convert"}
                </Typography.Text>
                {isSearchingRelationship ? (
                  <div className="flex justify-center py-2">
                    <Spin size="small" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <List
                    size="small"
                    bordered
                    dataSource={searchResults}
                    className="max-h-56 overflow-auto rounded-md"
                    renderItem={(item) => (
                      <List.Item
                        className={`cursor-pointer transition-colors ${
                          selectedRelationshipCard?.id === item.id
                            ? "border-blue-300 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedRelationshipCard(item)}
                      >
                        <div>
                          <div className="font-medium text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(item.listName ||
                              (item as any).list_name ||
                              "List") +
                              " • " +
                              (item.boardName ||
                                (item as any).board_name ||
                                "Board")}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Typography.Text
                    type="secondary"
                    className="text-xs italic block"
                  >
                    No cards yet – use the search field above
                  </Typography.Text>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Actions;
