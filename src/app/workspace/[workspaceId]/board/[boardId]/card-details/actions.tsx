import React, { useRef, useState } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import PopoverChecklist from "@components/popover-checklist";
import {
  Users,
  Tag,
  CheckSquare,
  Clock,
  Paperclip,
  MapPin,
  MoveRight,
  Copy,
  Archive,
  Share2,
  RectangleEllipsis,
  QrCode,
  RotateCcw,
  UserPlus,
  UserMinus,
} from "lucide-react";
import PopoverCustomField from "@components/popover-custom-field";
import PopoverUser from "@components/popover-user";
import PopoverDates from "@components/popover-dates.tsx";
import PopoverMoveCard from "@components/popover-move-card";
import PopoverCopyCard from "@components/popover-copy-card";
import { message, Tooltip } from "antd";
import QRModal from "./qr-modal/qr-modal";
import PopoverLocation from "@components/popover-location";
import PopoverAttach from "@components/popover-attach";
import { useCardCopy, useCardMove, useCards } from "@hooks/card";
import { useParams } from "next/navigation";
import { useCardDetails } from "@hooks/card-details";
import { useCurrentAccount } from "@hooks/account";
import { useCardMembers } from "@hooks/card_member";
import PopoverLabel from "@components/popover-label.tsx";

const Actions: React.FC = () => {
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openMembers, setOpenMembers] = useState(false);
  const [openDates, setOpenDates] = useState(false);
  const [openMoveCard, setOpenMoveCard] = useState(false);
  const [openCopyCard, setOpenCopyCard] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);
  const [openAttach, setOpenAttach] = useState(false);
  const [openChecklist, setOpenChecklist] = useState(false);
  const [openLabels, setOpenLabels] = useState(false);
  const { boardId } = useParams();
  const { selectedCard } = useCardDetailContext();
  const { archiveCard, unarchiveCard } = useCardDetails(
    selectedCard?.id || "",
    selectedCard?.listId || "",
    boardId as string
  );

  // Get current user and card members
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const { isMember, toggleMember, isAddingMember, isRemovingMember } =
    useCardMembers(selectedCard?.id || "");

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
      console.error("Error toggling card membership:", error);
    }
  };

  // Check if current user is a member
  const isCurrentUserMember = currentUser?.id
    ? isMember(currentUser.id)
    : false;

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

  return (
    <div className="w-full rounded-lg">
      {/* Join/Leave Button */}
      <Tooltip
        title={isCurrentUserMember ? "Leave this card" : "Join this card"}
      >
        <button
          onClick={handleJoinLeave}
          disabled={isAddingMember || isRemovingMember}
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-gray-600 text-xs">
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
      <PopoverLabel
        open={openLabels}
        setOpen={setOpenLabels}
        triggerEl={
          <Tooltip title="Manage card labels">
            <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
              <span className="text-gray-600 text-xs">
                <Tag size={14} />
              </span>
              <span className="text-xs">Labels</span>
            </button>
          </Tooltip>
        }
      />

      {/* Regular menu items (excluding Checklist and Labels) */}
      {menuItems
        .filter((item) => item.label !== "Checklist" && item.label !== "Labels")
        .map((item, index) => (
          <button
            key={index}
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
            <span className="text-gray-600 text-xs">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}

      {/* Checklist with Popover */}
      <PopoverChecklist
        open={openChecklist}
        setOpen={setOpenChecklist}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <CheckSquare size={14} />
            </span>
            <span className="text-xs">Checklist</span>
          </button>
        }
      />

      <PopoverAttach
        open={openAttach}
        setOpen={setOpenAttach}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <MapPin size={14} />
            </span>
            <span className="text-xs">Attachment</span>
          </button>
        }
      />

      <PopoverLocation
        open={openLocation}
        setOpen={setOpenLocation}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <MapPin size={14} />
            </span>
            <span className="text-xs">Location</span>
          </button>
        }
      />

      <PopoverUser
        open={openMembers}
        setOpen={setOpenMembers}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <Users size={14} />
            </span>
            <span className="text-xs">Members</span>
          </button>
        }
      />

      <PopoverDates
        open={openDates}
        setOpen={setOpenDates}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <Clock size={14} />
            </span>
            <span className="text-xs">Dates</span>
          </button>
        }
      />

      <PopoverCustomField
        open={openCustomField}
        setOpen={setOpenCustomField}
        triggerEl={
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <span className="text-gray-600 text-xs">
              <RectangleEllipsis size={14} />
            </span>
            <span className="text-xs">Custom fields</span>
          </button>
        }
      />

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
        <h3 className="text-sm font-medium text-gray-600 px-4 mb-2">Actions</h3>

        <PopoverMoveCard
          open={openMoveCard}
          setOpen={setOpenMoveCard}
          triggerEl={
            <Tooltip title={"Move this card to another card"}>
              <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
                <MoveRight size={14} />
                <span className="text-xs">Move</span>
              </button>
            </Tooltip>
          }
        />

        <Tooltip title="Copy this card to another list">
          <PopoverCopyCard
            open={openCopyCard}
            setOpen={setOpenCopyCard}
            triggerEl={
              <Tooltip title={"Copy this card to another list"}>
                <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
                  <Copy size={14} />
                  <span className="text-xs">Copy</span>
                </button>
              </Tooltip>
            }
          />
        </Tooltip>

        <Tooltip title="Archive this card">
          <button
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
            onClick={handleArchival}
          >
            {selectedCard?.archive ? (
              <>
                <RotateCcw size={14} />
                <span className="text-xs">Restore {selectedCard?.archive}</span>
              </>
            ) : (
              <>
                <Archive size={14} />
                <span className="text-xs">Archive {selectedCard?.archive}</span>
              </>
            )}
          </button>
        </Tooltip>

        {selectedCard?.archive && (
          <Tooltip title="Delete this card">
            <button
              className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
              color="danger"
            >
              <QrCode size={14} />
              <span className="text-xs">Delete</span>
            </button>
          </Tooltip>
        )}

        <Tooltip title="Share this card with others by copying the link">
          <button
            onClick={() => {
              const url = `${
                window.location.href
              }?listId=${"listId"}&cardId=${"cardId"}`;
              navigator.clipboard.writeText(url);
              message.info("Copied to clipboard");
            }}
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
            <Share2 size={14} />
            <span className="text-xs">Share</span>
          </button>
        </Tooltip>

        <Tooltip title="Generate this card QR code">
          <button
            onClick={() => {
              setOpenQrModal(true);
            }}
            className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
          >
            <QrCode size={14} />
            <span className="text-xs">Generate QR</span>
          </button>
        </Tooltip>

        <QRModal isOpen={openQrModal} onClose={() => setOpenQrModal(false)} />
      </div>
    </div>
  );
};

export default Actions;
