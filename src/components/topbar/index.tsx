"use client";
import { BellOutlined, FileOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Button, Dropdown, Input, Typography, List } from "antd";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import logo from "@assets/images/Logo_Ozzy_Clothing_png.png";
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import {
  selectTheme,
  selectUser,
  selectIsDarkMode,
  setUser,
  toggleTheme,
} from "@store/app_slice";
import { Sun, Moon } from "lucide-react";
import { useDispatch } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { WorkspaceSelection } from "../selection";
import ModalRequest from "../modal-request";
import ModalListRequest from "../modal-list-request";
import ModalRequestSent from "../modal-request-sent";
import ModalRequestProduksi from "../modal-request-produksi";
import WebSocketDebugModal from "../websocket-debug-modal";
import { searchCards } from "@api/card";
import { getRequestNotificationCounts } from "@api/accurate";
import { Card } from "@myTypes/card";
import TokenStorage from "@utils/token-storage";
import { useCurrentAccount } from "@hooks/account";
import {
  useUnifiedSearch,
  SearchResult,
  GroupedSearchResults,
} from "@hooks/search";
import { selectCurrentWorkspace, selectCurrentBoard } from "@store/workspace_slice";
import { useRecentlyViewed } from "@hooks/recently-viewed";

const { Text } = Typography;

// Basic role categorization helper reused in multiple spots
const getRoleCategory = (
  roleName: string
): "super_admin" | "supervisor" | "warehouse" | "production" => {
  if (!roleName) return "production";
  const lower = roleName.toLowerCase();
  if (lower === "super admin" || lower === "super_admin" || lower === "superadmin") {
    return "super_admin";
  }
  if (lower.includes("spv") || lower.includes("supervisor")) {
    return "supervisor";
  }
  if (lower.includes("warehouse")) {
    return "warehouse";
  }
  return "production";
};

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [modalRequestOpen, setModalRequestOpen] = useState(false);
  const [modalListRequestOpen, setModalListRequestOpen] = useState(false);
  const [modalRequestSentOpen, setModalRequestSentOpen] = useState(false);
  const [modalRequestProduksiOpen, setModalRequestProduksiOpen] = useState(false);
  const [wsDebugModalOpen, setWsDebugModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [requestCounts, setRequestCounts] = useState<{
    pendingVerification: number;
    pendingWarehouseSend: number;
  }>({ pendingVerification: 0, pendingWarehouseSend: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;
  const dispatch = useDispatch();
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

  const userRole = (user?.role?.name || "").trim();
  const isSuperAdmin =
    userRole.toLowerCase() === "super admin" || userRole === "Super Admin";
  const boardName = (currentBoard?.name || "").trim().toLowerCase();
  const isDateline = boardName === "dateline";

  const requestRoles = [
    "Admin Produksi",
    "Warehouse Bahan",
    "Kepala Produksi",
    "Operator Cutting",
    "Numbering",
    "Helper Line",
    "SPV Sewing",
    "SPV Operator Bordir",
    "Finishing & Packing",
    "Operator Krah Manset",
    "Kepala Gudang"
  ];
  const produksiRoles = requestRoles;
  const lihatRequestRoles = ["Kepala Produksi"];
  const gudangRoles = ["Warehouse Bahan", "Kepala Gudang", "Purchasing"];

  const roleInList = (allowed: string[]) =>
    allowed.some(
      (role) => role.toLowerCase() === userRole.toLowerCase().trim()
    );

  const canSeeButton = (key: "buat" | "produksi" | "lihat" | "gudang") => {
    if (isSuperAdmin) return true;
    if (!isDateline) return false;
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

  // Handle theme toggle
  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  // Use unified search hook with fallback workspaceId
  const {
    data: searchResults = { cards: [], boards: [] },
    isLoading: isSearching,
  } = useUnifiedSearch(searchQuery, workspaceId, {
    enabled: !!searchQuery && searchQuery.trim().length > 0,
  });

  // Recently viewed hook
  const { recentlyViewedItems } = useRecentlyViewed();

  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const userRoleDerived = (currentUser?.role?.name || userRole || "").trim();
  const roleCategory = getRoleCategory(userRoleDerived);

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

      <div className="flex items-center gap-5 w-100vh">
        {canSeeButton("buat") && (
          <Button onClick={() => setModalRequestOpen(true)}>
            Buat Request
          </Button>
        )}

        {canSeeButton("lihat") && (
          <Badge
            count={requestCounts.pendingVerification}
            overflowCount={99}
            offset={[-4, 6]}
          >
            <Button onClick={() => setModalListRequestOpen(true)}>
              Lihat Request
            </Button>
          </Badge>
        )}

        {canSeeButton("gudang") && (
          <Badge
            count={requestCounts.pendingWarehouseSend}
            overflowCount={99}
            offset={[-6, 8]}
          >
            <Button onClick={() => setModalRequestSentOpen(true)}>
              Gudang
            </Button>
          </Badge>
        )}

        {canSeeButton("produksi") && (
          <Button onClick={() => setModalRequestProduksiOpen(true)}>Produksi</Button>
        )}

        {/* WebSocket Debug Button - Only show in development */}
        {process.env.NODE_ENV === "development" && (
          <Button
            type="dashed"
            size="small"
            onClick={() => setWsDebugModalOpen(true)}
            title="WebSocket Debug"
          >
            WS Debug
          </Button>
        )}

        <div className="relative" ref={searchRef}>
          <Input
            placeholder="Search…"
            prefix={<i className="fi fi-rr-search" />}
            className={`rounded transition-all duration-200 ease-in-out`}
            style={{ width: showSearchDropdown ? "500px" : "200px" }}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
          />

          {showSearchDropdown && (
            <div
              className="absolute z-50 top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200"
              style={{ width: showSearchDropdown ? "500px" : "200px" }}
            >
              <div className="max-h-80 overflow-auto p-2">
                {isSearching ? (
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
                              className="w-full cursor-pointer hover:bg-gray-50 px-2 rounded py-1"
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
                                  <span className="text-sm">{item.name}</span>
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
                              className="w-full cursor-pointer hover:bg-gray-50 px-2 rounded py-1"
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
                      !isSearching && (
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

        {/* <Dropdown
          menu={{ items: notificationItems }}
          trigger={["click"]}
          open={notificationVisible}
          onOpenChange={setNotificationVisible}
        >
          <Badge count={4}>
            <BellOutlined className="text-xl cursor-pointer" />
          </Badge>
        </Dropdown> */}

        {/* Theme Toggle Button */}
        <div
          onClick={handleThemeToggle}
          className="relative inline-flex items-center w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ease-in-out mb-1 pb-2"
          style={{
            backgroundColor: isDarkMode
              ? `rgb(${colors.primary})`
              : `rgb(${colors.muted})`,
            border: `1px solid rgb(${colors.border})`,
          }}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {/* Toggle Circle */}
          <div
            className="absolute w-5 h-5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center"
            style={{
              backgroundColor: `rgb(${colors.surface})`,
              left: isDarkMode ? "26px" : "2px",
              top: "2px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            }}
          >
            {isDarkMode ? (
              <Moon size={12} style={{ color: `rgb(${colors.primary})` }} />
            ) : (
              <Sun size={12} style={{ color: `rgb(${colors.primary})` }} />
            )}
          </div>
        </div>

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
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;
