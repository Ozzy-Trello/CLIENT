"use client";
import { BellOutlined, FileOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Button, Dropdown, Input, Typography, List } from "antd";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import logo from "@assets/images/Logo_Ozzy_Clothing_png.png";
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme, selectUser, setUser } from "@store/app_slice";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { WorkspaceSelection } from "../selection";
import ModalRequest from "../modal-request";
import ModalListRequest from "../modal-list-request";
import ModalRequestSent from "../modal-request-sent";
import { searchCards } from "@api/card";
import { Card } from "@myTypes/card";
import TokenStorage from "@utils/token-storage";
import { useCurrentAccount } from "@hooks/account";
import {
  useUnifiedSearch,
  SearchResult,
  GroupedSearchResults,
} from "@hooks/search";
import { selectCurrentWorkspace } from "@store/workspace_slice";

const { Text } = Typography;

// Role categorization utility
const getRoleCategory = (
  roleName: string
): "super_admin" | "supervisor" | "warehouse" | "production" => {
  if (roleName === "Super Admin") {
    return "super_admin";
  }

  if (roleName.includes("SPV") || roleName.includes("Supervisor")) {
    return "supervisor";
  }

  if (roleName.includes("Warehouse")) {
    return "warehouse";
  }

  // Everyone else is production
  return "production";
};

// Check if user can access certain features based on role
const canAccessFeature = (
  userRole: string,
  feature: "request" | "list_request" | "warehouse"
): boolean => {
  const roleCategory = getRoleCategory(userRole);

  // Super Admin can access everything
  if (roleCategory === "super_admin") {
    return true;
  }

  switch (feature) {
    case "request":
      // Production can make requests
      return roleCategory === "production";

    case "list_request":
      // Supervisors can view requests
      return roleCategory === "supervisor";

    case "warehouse":
      // Warehouse roles can access warehouse features
      return roleCategory === "warehouse";

    default:
      return false;
  }
};

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [modalRequestOpen, setModalRequestOpen] = useState(false);
  const [modalListRequestOpen, setModalListRequestOpen] = useState(false);
  const [modalRequestSentOpen, setModalRequestSentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyViewedCards, setRecentlyViewedCards] = useState<Card[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const theme = useSelector(selectTheme);
  const { colors } = theme;
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector(selectUser);
  const currentWorkspace = useSelector(selectCurrentWorkspace);

  // Use unified search hook
  const {
    data: searchResults = { cards: [], boards: [] },
    isLoading: isSearching,
  } = useUnifiedSearch(searchQuery, currentWorkspace?.id, {
    enabled: !!searchQuery && searchQuery.trim().length > 0,
  });
  const notificationItems: MenuProps["items"] = [
    { key: "1", label: "Notification 1" },
    { key: "2", label: "Notification 2" },
    { key: "3", label: "Notification 3" },
  ];
  // Get current user and role
  const { data: currentAccountData } = useCurrentAccount();
  const currentUser = currentAccountData?.data;
  const userRole = currentUser?.role?.name || "";
  const roleCategory = getRoleCategory(userRole);

  const handleLogout = () => {
    router.push("/login");
    TokenStorage.clearTokens();
    dispatch(setUser({}));
  };
  const avatarMenuItems: MenuProps["items"] = [
    {
      key: "manage-profile",
      label: (
        <Link href="/workspace/account">
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
      router.push(
        `/workspace/${currentWorkspace?.id}/board/${result.boardId}?listId=${result.listId}&cardId=${result.id}`
      );
    } else if (result.type === "board") {
      const workspaceId = result.workspace_id || currentWorkspace?.id;
      if (workspaceId) {
        router.push(`/workspace/${workspaceId}/board/${result.id}`);
      }
    }
  };
  return (
    <div className="flex items-center justify-between h-[45px]">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <ImageDynamicContrast
            imageSrc={logo}
            rgbColor={`rgb(${colors.background})`}
            width={50}
            height="auto"
            alt="Ozzy Clothing logo"
          />
        </Link>
        {userRole && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {roleCategory.replace("_", " ").toUpperCase()}
            </span>
          </div>
        )}
        {/* <WorkspaceSelection /> */}
      </div>

      <div className="flex items-center gap-5 w-100vh">
        {canAccessFeature(userRole, "request") && (
          <Button onClick={() => setModalRequestOpen(true)}>
            Buat Request
          </Button>
        )}

        {canAccessFeature(userRole, "list_request") && (
          <Button onClick={() => setModalListRequestOpen(true)}>
            Lihat Request
          </Button>
        )}

        {canAccessFeature(userRole, "warehouse") && (
          <Button onClick={() => setModalRequestSentOpen(true)}>Gudang</Button>
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
                                  item.description ? (
                                    <div
                                      className="prose prose-sm max-w-none text-[10px] text-gray-500 line-clamp-1"
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          item.description.substring(0, 50) +
                                          (item.description.length > 50
                                            ? "..."
                                            : ""),
                                      }}
                                    />
                                  ) : null
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
                                  item.description ? (
                                    <div
                                      className="prose prose-sm max-w-none text-[10px] text-gray-500 line-clamp-1"
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          item.description.substring(0, 50) +
                                          (item.description.length > 50
                                            ? "..."
                                            : ""),
                                      }}
                                    />
                                  ) : null
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
                      dataSource={recentlyViewedCards}
                      renderItem={(item) => (
                        <List.Item
                          key={item.id}
                          className="cursor-pointer hover:bg-gray-50 px-2 rounded"
                        >
                          <List.Item.Meta
                            avatar={<FileOutlined className="text-blue-500" />}
                            title={item.name}
                            description={
                              <div>
                                <Text type="secondary" className="text-xs">
                                  Viewed {item.createdAt}
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
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;
