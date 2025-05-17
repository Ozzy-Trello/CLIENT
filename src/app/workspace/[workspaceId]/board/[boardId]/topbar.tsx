import {
  Button,
  Dropdown,
  MenuProps,
  message,
  Tooltip,
  Typography,
} from "antd";
import { useState, useEffect } from "react";
import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import MembersList from "@/app/components/members-list";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useRouter } from "next/navigation";
import {
  Ellipsis,
  ListFilter,
  Menu,
  SlidersHorizontal,
  Star,
  UserPlus,
  Users,
  QrCode,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectCurrentBoard } from "@/app/store/workspace_slice";

interface BoardTopbarProps {
  boardScopeMenuOpen: boolean;
  setBoardScopeMenuOpen: any;
}

const BoardTopbar: React.FC<BoardTopbarProps> = (props) => {
  const { boardScopeMenuOpen, setBoardScopeMenuOpen } = props;
  const { collapsed, siderSmall, siderWide } = useWorkspaceSidebar();
  const [showRightColMenu, setIsShowRighColtMenu] = useState(true);
  const [openRightMenu, setOpenRightMenu] = useState(false);
  const currentBoard = useSelector(selectCurrentBoard);
  const [openAddMember, setOpenAddMember] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const router = useRouter();

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
    window.addEventListener('resize', handleResize);

    // Clean up event listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [members, setMembers] = useState([
    // getUserById('1'),
    // getUserById('2'),
    // getUserById('3'),
    // getUserById('4'),
    // getUserById('5')
  ]);

  const rightMenu: MenuProps["items"] = [
    {
      key: "filter",
      label: (
        <Tooltip title={"filter"}>
          <Button size="small" shape="default">
            <SlidersHorizontal />
            <span>Filter</span>
          </Button>
        </Tooltip>
      ),
    },
    {
      key: "members",
      label: "Members",
    },
    {
      key: "share",
      label: "Share",
    },
  ];

  return (
    <div
      className="flex items-center justify-between h-[45px] absolute top-[45px] border-b border-gray-200 px-2"
      style={{
        width: collapsed
          ? `calc(100% - ${siderSmall}px)`
          : `calc(100% - ${siderWide}px)`,
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
        <Tooltip
          title={"Starred boards showed up at the top of your baord list"}
        >
          <Star size={16} className="cursor-pointer" />
        </Tooltip>
        <Tooltip title={"Change board visibility"}>
          <Users size={16} className="cursor-pointer" />
        </Tooltip>
      </div>

      <div>
        {showRightColMenu ? (
          <div className="flex items-center justify-end gap-2">
            <Tooltip title={"filter"}>
              <Button
                size="small"
                shape="default"
                icon={<ListFilter size={16} />}
              >
                <span>Filter</span>
              </Button>
            </Tooltip>
            <div>
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
            </Tooltip>
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
