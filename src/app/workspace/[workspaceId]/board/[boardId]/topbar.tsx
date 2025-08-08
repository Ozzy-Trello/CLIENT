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
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@store/workspace_slice";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "@api/index";
import { useWebSocket } from "@hooks/websocket";

interface BoardTopbarProps {
  boardScopeMenuOpen: boolean;
  setBoardScopeMenuOpen: any;
  openDashcardModal: boolean;
  setOpenDashcardModal: Dispatch<SetStateAction<boolean>>;
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
  const currentBoard = useSelector(selectCurrentBoard);
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showInvoiceInput, setShowInvoiceInput] = useState<boolean>(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isLoadingInvoice, setIsLoadingInvoice] = useState<boolean>(false);
  const router = useRouter();
  const { socket } = useWebSocket();

  // Handle responsive behavior for tablet devices
  useEffect(() => {
    const handleResize = () => {
      // Set breakpoint for tablet devices (typically between 768px and 1024px)
      if (window.innerWidth <= 1024 && window.innerWidth >= 768) {
        setIsShowRighColtMenu(false);
      } else {
        setIsShowRighColtMenu(true);
      }
    };

    // Set initial state based on current window size
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Clean up event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [members, setMembers] = useState([
    // getUserById('1'),
    // getUserById('2'),
    // getUserById('3'),
    // getUserById('4'),
    // getUserById('5')
  ]);

  const handleInvoiceSubmit = async () => {
    if (!invoiceNumber.trim()) {
      message.error("Please enter an invoice number");
      return;
    }

    // Format invoice number: convert slashes to dashes for backend
    const formattedInvoiceNumber = invoiceNumber.replace(/\//g, "-");

    setIsLoadingInvoice(true);
    try {
      const response = await api.get(
        `/accurate/invoice/${formattedInvoiceNumber}`
      );

      if (response.data.message === "Invoice added!") {
        message.success("Invoice processed successfully! Card created.");
        setInvoiceNumber("");
        setShowInvoiceInput(false);
      } else if (
        response.data.message === "Card with this invoice already exists!"
      ) {
        message.warning("Card with this invoice already exists!");
        setInvoiceNumber("");
        setShowInvoiceInput(false);
      } else {
        message.info(response.data.message);
        setInvoiceNumber("");
        setShowInvoiceInput(false);
      }
    } catch (error: any) {
      console.error("Error processing invoice:", error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error("Failed to process invoice. Please try again.");
      }
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
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-2"
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
        <Typography.Title level={4} className="m-0">
          {currentBoard?.name}
        </Typography.Title>
        {/* <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Star size={16} className="cursor-pointer" />
        </Tooltip>
        <Tooltip title={"Change board visibility"}>
          <Users size={16} className="cursor-pointer" />
        </Tooltip> */}
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
    </div>
  );
};

export default BoardTopbar;
