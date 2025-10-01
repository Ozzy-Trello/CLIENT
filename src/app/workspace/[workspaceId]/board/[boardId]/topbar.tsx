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
} from "antd";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
} from "lucide-react";
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

// Helper function to derive permission level from fine-grained permissions
const getPermissionLevelFromFineGrained = (
  permissions: FineGrainedPermissions | null
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
}

const BoardTopbar: React.FC<BoardTopbarProps> = (props) => {
  const {
    boardScopeMenuOpen,
    setBoardScopeMenuOpen,
    openDashcardModal,
    setOpenDashcardModal,
  } = props;
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const [showRightColMenu, setIsShowRighColtMenu] = useState(true);
  const [openRightMenu, setOpenRightMenu] = useState(false);
  const reduxBoard = useSelector(selectCurrentBoard);
  const currentBoard = props.board || reduxBoard;
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showInvoiceInput, setShowInvoiceInput] = useState<boolean>(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);
  const [modalDeliveryOpen, setModalDeliveryOpen] = useState<boolean>(false);
  const router = useRouter();
  const { socket } = useWebSocket();
  const params = useParams();
  const currentUser = useSelector(selectUser);

  // User board order hook for favorites
  const { userBoardOrder, toggleFavorite, isTogglingFavorite } =
    useUserBoardOrder(params.workspaceId as string);

  // Move old cards hook
  const moveOldCardsMutation = useMoveOldCards();
  const showMoveCardsButton = true; // You can add logic here to conditionally show this button
  const handleMoveCards = () => {
    moveOldCardsMutation.mutate();
  };
  const isMoveCardsPending = moveOldCardsMutation.isPending;

  // Determine if current board is favorited
  const isFavorited =
    userBoardOrder?.some(
      (order) => order.boardId === currentBoard?.id && order.isFavorite
    ) || false;

  const handleStarClick = () => {
    console.log(
      "[FAVORITE LOGS] Topbar star clicked for board:",
      currentBoard?.id
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
        "[FAVORITE LOGS] No current board, not calling toggleFavorite"
      );
    }
  };

  const handleInvoiceSubmit = async () => {
    if (!invoiceNumber.trim()) {
      message.error("Please enter an invoice number");
      return;
    }

    setIsLoadingInvoice(true);
    try {
      // Add your invoice submission logic here
      // For example: await api.post('/invoices', { invoiceNumber, boardId: currentBoard?.id });

      message.success("Invoice added successfully");
      setInvoiceNumber("");
      setShowInvoiceInput(false);
    } catch (error) {
      console.error("Error submitting invoice:", error);
      message.error("Failed to add invoice");
    } finally {
      setIsLoadingInvoice(false);
    }
  };

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

  return (
    <div
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-4"
      style={{
        width: collapsed
          ? `calc(100% - ${siderSmall}px)`
          : `calc(100% - ${siderWide}px)`,
        backgroundColor: currentBoard?.background || "#fff",
      }}
    >
      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Scanner
              onScan={(codes) => {
                if (codes.length > 0) {
                  const url = codes[0].rawValue;
                  try {
                    // Check if the result is a valid URL
                    const parsedUrl = new URL(url);

                    // Check if the URL contains 'ozzy' or 'localhost'
                    const urlString = url.toLowerCase();
                    if (!urlString.includes(window.location.hostname)) {
                      message.error("URL invalid.");
                      return;
                    }

                    setScanResult(url);
                    setShowScanner(false);
                    // Navigate to the scanned URL
                    router.push(url);
                  } catch (error) {
                    console.error("Invalid URL scanned:", error);
                    message.error("Invalid QR code. Please scan a valid URL.");
                  }
                }
              }}
              onError={(error) => {
                console.error("Camera error:", error);
                setShowScanner(false);
              }}
            />
            <button
              onClick={() => setShowScanner(false)}
              className="mt-2 px-4 py-1 rounded bg-gray-200 text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 ml-5">
        <title>{currentBoard?.name}</title>

        <Typography.Title level={4} className="m-0">
          {currentBoard?.name}
        </Typography.Title>
        <Tooltip
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            size={16}
            className={`transition-colors cursor-pointer ${
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

      <div>
        {showRightColMenu ? (
          <div className="flex items-center justify-end gap-2">
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
            {/* <Tooltip title={"filter"}>
              <Button
                size="small"
                shape="default"
                icon={<ListFilter size={16} />}
              >
                <span>Filter</span>
              </Button>
            </Tooltip> */}
            <Popover
              content={
                <div className="p-2">
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: "100%" }}
                  >
                    <Typography.Text strong>
                      Enter Invoice Number
                    </Typography.Text>
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
                          setInvoiceNumber("");
                        }}
                      >
                        Cancel
                      </Button>
                    </Space>
                  </Space>
                </div>
              }
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

            <Tooltip title="Delivery">
              <Button
                type="primary"
                size="small"
                onClick={() => setModalDeliveryOpen(true)}
                style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
              >
                <span>Delivery</span>
              </Button>
            </Tooltip>

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
            <Tooltip title="Scan QR Code">
              <Button
                size="small"
                icon={<QrCode size={16} />}
                onClick={() => setShowScanner(true)}
              />
            </Tooltip>
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

      <ModalDelivery
        open={modalDeliveryOpen}
        onClose={() => setModalDeliveryOpen(false)}
      />
    </div>
  );
};

export default BoardTopbar;
