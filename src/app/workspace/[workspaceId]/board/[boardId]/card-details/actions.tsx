import React, { useRef, useState } from "react";
import {
  Users,
  Tag,
  CheckSquare,
  Clock,
  Paperclip,
  MapPin,
  Database,
  PlusCircle,
  MoveRight,
  Plus,
  Copy,
  Archive,
  Share2,
  RectangleEllipsis,
  QrCode,
} from "lucide-react";
import PopoverCustomField from "@/app/components/popover-custom-field";
import PopoverUser from "@/app/components/popover-user";
import PopoverDates from "@/app/components/popover-dates.tsx";
import PopoverMoveCard from "@/app/components/popover-move-card";
import PopoverCopyCard from "@/app/components/popover-copy-card";
import { message, Tooltip } from "antd";
import QRModal from "./qr-modal/qr-modal";

const Actions: React.FC = ({}) => {
  const [openCustomField, setOpenCustomField] = useState(false);
  const [openMembers, setOpenMembers] = useState(false);
  const [openDates, setOpenDates] = useState(false);
  const [openMoveCard, setOpenMoveCard] = useState(false);
  const [openCopyCard, setOpenCopyCard] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);

  const menuItems = [
    { icon: <Users size={14} />, label: "Join" },
    { icon: <Tag size={14} />, label: "Labels" },
    { icon: <CheckSquare size={14} />, label: "Checklist" },
    { icon: <Paperclip size={14} />, label: "Attachment" },
    { icon: <MapPin size={14} />, label: "Location" },
  ];

  return (
    <div className="w-full rounded-lg">
      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <button
          key={index}
          className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700"
        >
          <span className="text-gray-600 text-xs">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </button>
      ))}

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
          <button className="text-xs flex items-center gap-3 w-full text-left py-2 px-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors mb-1 text-gray-700">
            <Archive size={14} />
            <span className="text-xs">Archive</span>
          </button>
        </Tooltip>

        <Tooltip title="Share this card with others by copying the link">
          <button
            onClick={() => {
              const url = `${window.location.href}?listId=${"listId"}&cardId=${"cardId"}`;
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

        <QRModal isOpen={openQrModal} onClose={() => {setOpenQrModal(false)}} />
      </div>
    </div>
  );
};

export default Actions;
