"use client";
import { FileOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Input,
  List,
  Modal,
  Tabs,
  Typography,
  message,
} from "antd";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import logo from "@assets/images/Logo_Ozzy_Clothing_png.png";
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme, selectUser } from "@store/app_slice";
import { Menu as MenuIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import ModalRequest from "../modal-request";
import ModalListRequest from "../modal-list-request";
import ModalRequestSent from "../modal-request-sent";
import ModalRequestProduksi from "../modal-request-produksi";
import WebSocketDebugModal from "../websocket-debug-modal";
import { getRequestNotificationCounts } from "@api/accurate";
import { getUnfinishedCardAccessories } from "@api/unfinished-accessory";
import TokenStorage from "@utils/token-storage";
import { SearchResult, useUnifiedSearch } from "@hooks/search";
import { selectCurrentBoard, selectCurrentWorkspace } from "@store/workspace_slice";
import { useRecentlyViewed } from "@hooks/recently-viewed";
import GenericPlannerView from "@components/generic-planner-view";
import GenericPlannerInputView from "@components/generic-planner-view/input-view";
import { NotificationBell } from "@components/notifications/notification-bell";

const { Text } = Typography;

type PlannerModalProps = {
  open: boolean;
  title: string;
  plannerName: string;
  onClose: () => void;
  defaultTab?: "input" | "planner";
  disabled?: boolean;
};

// Reusable planner modal to keep padding/layout consistent across Cutting/Bordir/Krah
const PlannerModal: React.FC<PlannerModalProps> = ({
  open,
  title,
  plannerName,
  onClose,
  defaultTab = "input",
  disabled = false,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={title}
      width="90vw"
      destroyOnClose
      styles={{
        body: {
          padding: "1rem",
        },
      }}
    >
      <Tabs
        defaultActiveKey={defaultTab}
        items={[
          {
            key: "input",
            label: "Input",
            children: (
              <div style={{ padding: "8px 0" }}>
                <GenericPlannerInputView plannerName={plannerName} disabled={disabled} />
              </div>
            ),
          },
          {
            key: "planner",
            label: "Planner",
            children: (
              <div style={{ padding: "8px 0" }}>
                <GenericPlannerView plannerName={plannerName} disabled={disabled} />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [modalRequestOpen, setModalRequestOpen] = useState(false);
  const [modalListRequestOpen, setModalListRequestOpen] = useState(false);
  const [modalRequestSentOpen, setModalRequestSentOpen] = useState(false);
  const [modalRequestProduksiOpen, setModalRequestProduksiOpen] = useState(false);
  const [modalSewingOpen, setModalSewingOpen] = useState(false);
  const [modalCuttingOpen, setModalCuttingOpen] = useState(false);
  const [modalBordirOpen, setModalBordirOpen] = useState(false);
  const [modalKrahOpen, setModalKrahOpen] = useState(false);
  const [wsDebugModalOpen, setWsDebugModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [requestCounts, setRequestCounts] = useState<{
    pendingVerification: number;
    pendingWarehouseSend: number;
  }>({ pendingVerification: 0, pendingWarehouseSend: 0 });
  const [pendingAccessoryCount, setPendingAccessoryCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const router = useRouter();
  const params = useParams();
  const user = useSelector(selectUser);
  const currentWorkspace = useSelector(selectCurrentWorkspace);
  const currentBoard = useSelector(selectCurrentBoard);

  // Get workspaceId with fallback to URL params
  const getWorkspaceId = (): string | undefined => {
    // First try to get from Redux store
    if (currentWorkspace?.id) {
      return currentWorkspace.id;
    }

    // Fallback to URL params if Redux store is not yet populated
    if (params.workspaceId) {
      const urlWorkspaceId = Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : params.workspaceId;
      return urlWorkspaceId;
    }

    return undefined;
  };

  console.log(user,'<< ini isi user')

  const userRole = (user?.role?.name || "").trim();
  const isSuperAdmin =
    userRole.toLowerCase() === "super admin" || userRole === "Super Admin";
  const boardName = (currentBoard?.name || "").trim().toLowerCase();
  const urlBoardId = Array.isArray(params?.boardId)
    ? params.boardId[0]
    : (params?.boardId as string | undefined);
  const DATELINE_BOARD_ID = "7c81b8c7-9d57-4a65-9e93-9c5d44218071";
  const isDateline =
    boardName === "dateline" ||
    (typeof urlBoardId === "string" && urlBoardId === DATELINE_BOARD_ID);

  const ROLES = {
    ADMIN_PRODUKSI: "Admin Produksi",
    WAREHOUSE_BAHAN: "Warehouse Bahan",
    CUTTING: "Cutting",
    KEPALA_PRODUKSI: "Kepala Produksi",
    OPERATOR_CUTTING: "Operator Cutting",
    NUMBERING: "Numbering",
    HELPER_LINE: "Helper Line",
    SPV_SEWING: "SPV Sewing",
    SPV_BORDIR: "SPV Operator Bordir",
    FINISHING: "Finishing & Packing",
    OPERATOR_KRAH: "Operator Krah Manset",
    KEPALA_GUDANG: "Kepala Gudang",
    PURCHASING: "Purchasing",
    SPV_DEAL_MAKER: "SPV Deal Maker",
    DEAL_MAKER: "Deal Maker",
    SPV_OUTLET: "SPV Outlet",
  } as const;

  type Role = typeof ROLES[keyof typeof ROLES];

  const produksiRoles: Role[] = [
    ROLES.ADMIN_PRODUKSI,
    ROLES.KEPALA_PRODUKSI,
    ROLES.OPERATOR_CUTTING,
    ROLES.CUTTING,
    ROLES.NUMBERING,
    ROLES.HELPER_LINE,
    ROLES.SPV_SEWING,
    ROLES.SPV_BORDIR,
    ROLES.FINISHING,
    ROLES.OPERATOR_KRAH,
    ROLES.KEPALA_GUDANG,
  ];

  const gudangRoles: Role[] = [
    ROLES.WAREHOUSE_BAHAN,
    ROLES.KEPALA_GUDANG,
    ROLES.PURCHASING,
  ];

  // Capacity Planner: Can Edit
  const capacityEditRoles: string[] = [
    ROLES.KEPALA_PRODUKSI,
    ROLES.ADMIN_PRODUKSI,
    ROLES.SPV_BORDIR,
    ROLES.SPV_SEWING,
  ];

  // Capacity Planner: Can View (disabled editing)
  const capacityViewRoles: string[] = [
    ROLES.SPV_DEAL_MAKER,
    ROLES.DEAL_MAKER,
    ROLES.SPV_OUTLET,
    ROLES.PURCHASING,
  ];

  const lihatRequestRoles: Role[] = [ROLES.KEPALA_PRODUKSI];

  // requestRoles = produksi + gudang (auto, no duplication)
  const requestRoles: Role[] = Array.from(new Set([...produksiRoles, ...gudangRoles]));

  const roleInList = (allowed: string[]) =>
    allowed.some(
      (role) => role.toLowerCase() === userRole.toLowerCase().trim()
    );

  const canSeeButton = (key: "buat" | "produksi" | "lihat" | "gudang") => {
    if (isSuperAdmin) return true;

    switch (key) {
      case "buat":
        return roleInList(requestRoles);
      case "produksi":
        return roleInList(produksiRoles);
      case "lihat":
        return roleInList(lihatRequestRoles);
      case "gudang":
        return roleInList(gudangRoles);
      default:
        return false;
    }
  };

  // Capacity Planner visibility: only on Dateline board
  const canSeeCapacity = (): boolean => {
    if (isSuperAdmin) return true;
    if (!isDateline) return false;
    return roleInList([...capacityEditRoles, ...capacityViewRoles]);
  };

  // Capacity Planner edit permission
  const canEditCapacity = (): boolean => {
    if (isSuperAdmin) return true;
    return roleInList(capacityEditRoles);
  };

  // Status Aksesoris visibility: only on Dateline board
  const canSeeAccessoryStatus = (): boolean => {
    return Boolean(isDateline && workspaceId);
  };

  // Fetch request/warehouse counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await getRequestNotificationCounts();
        const counts = res?.data?.data || res?.data || res;
        setRequestCounts({
          pendingVerification: counts?.pendingVerification ?? 0,
          pendingWarehouseSend: counts?.pendingWarehouseSend ?? 0,
        });
      } catch (error) {
        console.error("Failed to load request notification counts", error);
      }
    };

    fetchCounts();

    // Listen for websocket updates
    const wsUrl =
      process.env.NEXT_PUBLIC_BE_BASE_URL?.replace("http", "ws") + "/ws";
    const ws = wsUrl ? new WebSocket(wsUrl) : null;

    if (ws) {
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === "request:counts") {
            setRequestCounts({
              pendingVerification: payload.data?.pendingVerification ?? 0,
              pendingWarehouseSend: payload.data?.pendingWarehouseSend ?? 0,
            });
          }
        } catch (e) {
          console.warn("Unable to parse websocket message", e);
        }
      };
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const workspaceId = getWorkspaceId();

  useEffect(() => {
    const fetchPendingAccessoryCount = async () => {
      if (!workspaceId) {
        setPendingAccessoryCount(0);
        return;
      }
      try {
        const res = await getUnfinishedCardAccessories(workspaceId, 1, 1);
        setPendingAccessoryCount(res?.paginate?.totalData ?? 0);
      } catch (error) {
        console.error("Failed to load pending accessory count", error);
      }
    };

    fetchPendingAccessoryCount();

    const interval = setInterval(fetchPendingAccessoryCount, 60_000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const trimmed = searchQuery.trim();
    // Only debounce if query meets minimum length (2 chars)
    if (trimmed.length < 2) {
      setDebouncedSearchQuery("");
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(trimmed);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Use unified search hook with fallback workspaceId
  const {
    data: searchResults = { cards: [], boards: [] },
    isLoading: isSearching,
  } = useUnifiedSearch(debouncedSearchQuery, workspaceId, {
    enabled: debouncedSearchQuery.length >= 2,
  });
  const isDebouncing =
    searchQuery.trim().length >= 2 && searchQuery.trim() !== debouncedSearchQuery;
  const showSearchingState = isSearching || isDebouncing;

  // Recently viewed hook
  const { recentlyViewedItems } = useRecentlyViewed();

  const handleLogout = () => {
    router.push("/login");
    TokenStorage.clearTokens();
  };
  const avatarMenuItems: MenuProps["items"] = [
    {
      key: "manage-profile",
      label: (
        <Link href="/account">
          <div className="flex items-center gap-2">
            {user?.avatar ? (
              <Avatar size="small" src={user.avatar} />
            ) : (
              <Avatar size="small" icon={<UserOutlined />} />
            )}
            <div>
              <Typography.Title level={5} className="m-0">
                {user?.username}
              </Typography.Title>
              <Typography.Text>{user?.email}</Typography.Text>
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: "logout",
      label: (
        <div className="flex items-center gap-2" onClick={handleLogout}>
          <i className="fi fi-rr-exit" />
          Logout
        </div>
      ),
    },
  ];

  const mobileActionMenuItems: MenuProps["items"] = [];
  if (canSeeButton("buat")) {
    mobileActionMenuItems.push({
      key: "buat-request",
      label: "Buat Request",
      onClick: () => setModalRequestOpen(true),
    });
  }
  if (canSeeButton("lihat")) {
    mobileActionMenuItems.push({
      key: "lihat-request",
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>Lihat Request</span>
          <Badge count={requestCounts.pendingVerification} overflowCount={99} />
        </div>
      ),
      onClick: () => setModalListRequestOpen(true),
    });
  }
  if (canSeeButton("gudang")) {
    mobileActionMenuItems.push({
      key: "gudang-request",
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>Gudang</span>
          <Badge count={requestCounts.pendingWarehouseSend} overflowCount={99} />
        </div>
      ),
      onClick: () => setModalRequestSentOpen(true),
    });
  }
  if (canSeeButton("produksi")) {
    mobileActionMenuItems.push({
      key: "produksi-request",
      label: "Produksi",
      onClick: () => setModalRequestProduksiOpen(true),
    });
  }

  if (canSeeCapacity()) {
    if (mobileActionMenuItems.length > 0) {
      mobileActionMenuItems.push({ type: "divider" });
    }
    mobileActionMenuItems.push({
      key: "capacity-planner",
      label: "Capacity Planner",
      children: [
        { key: "planner-cutting", label: "Cutting", onClick: () => setModalCuttingOpen(true) },
        { key: "planner-sewing", label: "Sewing", onClick: () => setModalSewingOpen(true) },
        { key: "planner-bordir", label: "Bordir", onClick: () => setModalBordirOpen(true) },
        { key: "planner-krah", label: "Krah & Manset", onClick: () => setModalKrahOpen(true) },
      ],
    });
  }

  if (canSeeAccessoryStatus()) {
    mobileActionMenuItems.push({
      key: "status-aksesoris",
      label: (
        <div className="flex items-center justify-between gap-3">
          <span>Status Aksesoris</span>
          <Badge count={pendingAccessoryCount} overflowCount={99} />
        </div>
      ),
      onClick: () =>
        router.push(`/workspace/${workspaceId}/aksesoris/status-aksesoris`),
    });
  }

  if (process.env.NODE_ENV === "development") {
    if (mobileActionMenuItems.length > 0) {
      mobileActionMenuItems.push({ type: "divider" });
    }
    mobileActionMenuItems.push({
      key: "ws-debug",
      label: "WS Debug",
      onClick: () => setWsDebugModalOpen(true),
    });
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      setShowSearchDropdown(true);
    } else {
      setShowSearchDropdown(false);
    }
  };

  // Handle clicks outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search input focus
  const handleSearchFocus = () => {
    setShowSearchDropdown(true);
  };

  // Handle clicking on search results
  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    if (result.hasAccess === false) {
      message.warning("Anda tidak memiliki akses ke board ini");
      return;
    }

    if (result.type === "card") {
      // Get workspace ID with fallback priority:
      // 1. result.workspace_id (snake_case - from backend, now properly returned)
      // 2. result.workspaceId (camelCase - if frontend transforms it)
      // 3. currentWorkspace?.id (from Redux store)
      // 4. workspaceId (from URL params)
      const targetWorkspaceId =
        result.workspaceId || currentWorkspace?.id || workspaceId;

      if (targetWorkspaceId) {
        router.push(
          `/workspace/${targetWorkspaceId}/board/${result.boardId}?listId=${result.listId}&cardId=${result.id}`
        );
      }
    } else if (result.type === "board") {
      const targetWorkspaceId =
        result.workspaceId || currentWorkspace?.id || workspaceId;

      if (targetWorkspaceId) {
        router.push(`/workspace/${targetWorkspaceId}/board/${result.id}`);
      }
    }
  };
  return (
    <div className="flex items-center justify-between h-[45px]">
      <div className="flex items-center gap-2">
        <Link href="/">
          <ImageDynamicContrast
            imageSrc={logo}
            rgbColor={`rgb(${colors.background})`}
            width={50}
            height="auto"
            alt="Ozzy Clothing logo"
          />
        </Link>
        {/* <WorkspaceSelection /> */}
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <div className="hidden sm:flex items-center gap-5 flex-shrink-0">
          {canSeeButton("buat") && (
            <Button onClick={() => setModalRequestOpen(true)}>
              Buat Request
            </Button>
          )}

          {canSeeButton("lihat") && (
            <div className="hidden md:block">
              <Badge
                count={requestCounts.pendingVerification}
                overflowCount={99}
                offset={[-4, 6]}
              >
                <Button onClick={() => setModalListRequestOpen(true)}>
                  Lihat Request
                </Button>
              </Badge>
            </div>
          )}

          {canSeeButton("gudang") && (
            <div className="hidden lg:block">
              <Badge
                count={requestCounts.pendingWarehouseSend}
                overflowCount={99}
                offset={[-6, 8]}
              >
                <Button onClick={() => setModalRequestSentOpen(true)}>
                  Gudang
                </Button>
              </Badge>
            </div>
          )}

          {canSeeButton("produksi") && (
            <div className="hidden lg:block">
              <Button onClick={() => setModalRequestProduksiOpen(true)}>
                Produksi
              </Button>
            </div>
          )}

          {canSeeCapacity() && (
            <div className="hidden lg:flex items-center gap-2">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "cutting",
                      label: "Cutting",
                      onClick: () => setModalCuttingOpen(true),
                    },
                    {
                      key: "sewing",
                      label: "Sewing",
                      onClick: () => setModalSewingOpen(true),
                    },
                    {
                      key: "bordir",
                      label: "Bordir",
                      onClick: () => setModalBordirOpen(true),
                    },
                    {
                      key: "krah",
                      label: "Krah & Manset",
                      onClick: () => setModalKrahOpen(true),
                    },
                  ],
                }}
                placement="bottom"
                trigger={["click"]}
              >
                <Button>Capacity Planner</Button>
              </Dropdown>

            </div>
          )}

          {canSeeAccessoryStatus() && (
            <div className="hidden lg:block">
              <Badge count={pendingAccessoryCount} overflowCount={99} offset={[-6, 8]}>
                <Button
                  onClick={() =>
                    router.push(`/workspace/${workspaceId}/aksesoris/status-aksesoris`)
                  }
                >
                  Status Aksesoris
                </Button>
              </Badge>
            </div>
          )}

          {/* WebSocket Debug Button - Only show in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="hidden lg:block">
              <Button
                type="dashed"
                size="small"
                onClick={() => setWsDebugModalOpen(true)}
                title="WebSocket Debug"
              >
                WS Debug
              </Button>
            </div>
          )}
        </div>

        <div className="relative flex-1 sm:flex-none sm:w-[240px] md:w-[320px] lg:w-[500px]" ref={searchRef}>
          <Input
            placeholder="Search…"
            prefix={<i className="fi fi-rr-search" />}
            className={`w-full rounded transition-all duration-200 ease-in-out`}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
          />

          {showSearchDropdown && (
            <div
              className="absolute z-[999] top-full left-0 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200"
            >
              <div className="max-h-80 overflow-auto p-2">
                {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Type at least 2 characters to search
                  </div>
                ) : showSearchingState ? (
                  <div className="flex justify-center py-4">
                    <span>Searching...</span>
                  </div>
                ) : searchQuery ? (
                  <div className="w-full">
                    <Text strong>Search Results</Text>

                    {/* Cards Section */}
                    {searchResults.cards.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                          Cards
                        </div>
                        <List
                          dataSource={searchResults.cards}
                          renderItem={(item) => (
                            <List.Item
                              key={item.id}
                              className={`w-full ${
                                item.hasAccess === false
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-gray-50"
                              } px-2 rounded py-1`}
                              onClick={() => handleSearchResultClick(item)}
                            >
                              <List.Item.Meta
                                avatar={
                                  item.cover ? (
                                    <img
                                      src={item.cover}
                                      alt={item.name}
                                      className="w-8 h-6 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="flex justify-center items-center w-8 h-6 rounded bg-gray-200">
                                      <FileOutlined className="text-gray-500 text-xs" />
                                    </div>
                                  )
                                }
                                title={
                                  <span className="text-sm">
                                    {item.name}
                                    {item.hasAccess === false && (
                                      <span className="text-xs text-red-400 ml-1">
                                        (No Access)
                                      </span>
                                    )}
                                  </span>
                                }
                                description={
                                  <div className="text-[10px] text-gray-500">
                                    {/* Board and List info */}
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="font-medium">
                                        {item.boardName || "Unknown Board"}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {item.listName || "Unknown List"}
                                      </span>
                                    </div>
                                    {item.noFaktur && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <span className="font-medium">No Faktur</span>
                                        <span>•</span>
                                        <span className="truncate">{item.noFaktur}</span>
                                      </div>
                                    )}
                                    {/* Description */}
                                    {item.description && (
                                      <div
                                        className="prose prose-sm max-w-none line-clamp-1"
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            item.description.substring(0, 50) +
                                            (item.description.length > 50
                                              ? "..."
                                              : ""),
                                        }}
                                      />
                                    )}
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                          className="border-0"
                        />
                      </div>
                    )}

                    {/* Separator */}
                    {searchResults.cards.length > 0 &&
                      searchResults.boards.length > 0 && (
                        <div className="border-t border-gray-200 my-2"></div>
                      )}

                    {/* Boards Section */}
                    {searchResults.boards.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                          Boards
                        </div>
                        <List
                          dataSource={searchResults.boards}
                          renderItem={(item) => (
                            <List.Item
                              key={item.id}
                              className={`w-full ${
                                item.hasAccess === false
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-gray-50"
                              } px-2 rounded py-1`}
                              onClick={() => handleSearchResultClick(item)}
                            >
                              <List.Item.Meta
                                avatar={
                                  <div className="flex justify-center items-center w-8 h-6 rounded bg-blue-100">
                                    <i className="fi fi-rr-layout-fluid text-blue-600 text-xs"></i>
                                  </div>
                                }
                                title={
                                  <span className="text-sm font-medium">
                                    {item.name}
                                    {item.hasAccess === false && (
                                      <span className="text-xs text-red-400 ml-1">
                                        (No Access)
                                      </span>
                                    )}
                                  </span>
                                }
                                description={
                                  <div className="text-[10px] text-gray-500">
                                    {/* Workspace info */}
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="font-medium">
                                        {item.workspaceName ||
                                          "Unknown Workspace"}
                                      </span>
                                    </div>
                                    {/* Description */}
                                    {item.description && (
                                      <div
                                        className="prose prose-sm max-w-none line-clamp-1"
                                        dangerouslySetInnerHTML={{
                                          __html:
                                            item.description.substring(0, 50) +
                                            (item.description.length > 50
                                              ? "..."
                                              : ""),
                                        }}
                                      />
                                    )}
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                          className="border-0"
                        />
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.cards.length === 0 &&
                      searchResults.boards.length === 0 &&
                      !showSearchingState && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No results found
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="w-full">
                    <Text strong>Recently Viewed</Text>
                    <List
                      dataSource={recentlyViewedItems}
                      renderItem={(item) => (
                        <List.Item
                          key={`${item.type}-${item.id}`}
                          className="cursor-pointer hover:bg-gray-50 px-2 rounded"
                        >
                          <List.Item.Meta
                            avatar={
                              item.type === "card" ? (
                                <FileOutlined className="text-blue-500" />
                              ) : (
                                <UserOutlined className="text-green-500" />
                              )
                            }
                            title={item.name}
                            description={
                              <div>
                                <Text type="secondary" className="text-xs">
                                  {item.type === "card" ? "Card" : "Board"} •
                                  Viewed{" "}
                                  {new Date(item.viewedAt).toLocaleDateString()}
                                </Text>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: "No recently viewed items" }}
                      className="max-h-48 overflow-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {mobileActionMenuItems.length > 0 && (
          <div className="lg:hidden">
            <Dropdown
              menu={{ items: mobileActionMenuItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button
                size="small"
                type="text"
                icon={<MenuIcon size={18} />}
                aria-label="Open menu"
              />
            </Dropdown>
          </div>
        )}

        <NotificationBell />

        <Dropdown
          menu={{ items: avatarMenuItems }}
          trigger={["click"]}
          open={avatarMenuVisible}
          onOpenChange={setAvatarMenuVisible}
        >
          <Avatar
            size="small"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "25px",
            }}
            className="cursor-pointer"
            icon={<UserOutlined />}
          />
        </Dropdown>
      </div>
      <ModalRequest
        open={modalRequestOpen}
        onClose={() => setModalRequestOpen(false)}
      />
      <ModalListRequest
        open={modalListRequestOpen}
        onClose={() => setModalListRequestOpen(false)}
      />
      <ModalRequestSent
        open={modalRequestSentOpen}
        onClose={() => setModalRequestSentOpen(false)}
      />
      <ModalRequestProduksi
        open={modalRequestProduksiOpen}
        onClose={() => setModalRequestProduksiOpen(false)}
      />
      <WebSocketDebugModal
        open={wsDebugModalOpen}
        onClose={() => setWsDebugModalOpen(false)}
      />
      <PlannerModal
        open={modalSewingOpen}
        onClose={() => setModalSewingOpen(false)}
        title="Sewing"
        plannerName="Sewing"
        disabled={!canEditCapacity()}
      />

      <PlannerModal
        open={modalCuttingOpen}
        onClose={() => setModalCuttingOpen(false)}
        title="Cutting"
        plannerName="Cutting"
        disabled={!canEditCapacity()}
      />

      <PlannerModal
        open={modalBordirOpen}
        onClose={() => setModalBordirOpen(false)}
        title="Bordir"
        plannerName="Bordir"
        disabled={!canEditCapacity()}
      />

      <PlannerModal
        open={modalKrahOpen}
        onClose={() => setModalKrahOpen(false)}
        title="Krah & Manset"
        plannerName="Knitting (KM)"
        disabled={!canEditCapacity()}
      />
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;
