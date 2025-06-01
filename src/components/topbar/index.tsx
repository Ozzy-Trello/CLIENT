'use client';
import { BellOutlined, FileOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input, Typography, List } from "antd";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import logo from '@assets/images/Logo_Ozzy_Clothing_png.png';
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme, selectUser, setAccessToken, setUser } from "@store/app_slice";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { WorkspaceSelection } from "../selection";
import { searchCards } from "@api/card";
import { Card } from "@myTypes/card";

const { Text } = Typography;

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [recentlyViewedCards, setRecentlyViewedCards] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const theme = useSelector(selectTheme);
  const {colors} = theme;
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector(selectUser);
 
  const notificationItems: MenuProps["items"] = [
    { key: "1", label: "Notification 1" },
    { key: "2", label: "Notification 2" },
    { key: "3", label: "Notification 3" },
  ];
 
  const handleLogout = () => {
    router.push("/login");
    dispatch(setAccessToken(""));
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
              <Typography.Title level={5} className="m-0">{user?.username}</Typography.Title>
              <Typography.Text>{user?.email}</Typography.Text>
            </div>
          </div>
        </Link>
      )
    },
    {
      key: "logout",
      label: (
        <div className="flex items-center gap-2" onClick={handleLogout}>
          <i className="fi fi-rr-exit" />
          Logout
        </div>
      )
    },
  ];


  // Handle search input change
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      setIsSearching(true);
      setShowSearchDropdown(true);
      
      try {
            
        const results = await searchCards({name: query, desription: query});
        if (results && results?.data) {
          setSearchResults(results.data);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setShowSearchDropdown(false);
      setSearchResults([]);
    }
  };

  // Handle clicks outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input focus
  const handleSearchFocus = () => {
    setShowSearchDropdown(true);
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
        <WorkspaceSelection />
      </div>
     
      <div className="flex justify-end items-center gap-5 w-100">
        <div className="relative" ref={searchRef}>
          <Input
            placeholder="Search…"
            prefix={<i className="fi fi-rr-search" />}
            className="w-[200px] rounded"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
          />
          
          {showSearchDropdown && (
            <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-white rounded-md shadow-lg border border-gray-200">
              <div className="max-h-80 overflow-auto p-2">
                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <span>Searching...</span>
                  </div>
                ) : searchQuery ? (
                  <div className="w-full">
                    <Text strong>Search Results</Text>
                    <List
                      dataSource={searchResults}
                      renderItem={(item) => (
                        <List.Item
                          key={item.id}
                          className="w-full cursor-pointer hover:bg-gray-50 px-2 rounded"
                        >
                          <List.Item.Meta
                            avatar={
                              item.cover ?
                                <img src={item.cover} alt={item.name} className="w-12 h-auto object-cover rounded"/> :
                                <div className="flex justify-center items-center w-12 h-8 rounded bg-gray-200">
                                  <Avatar shape="square" size="small" src={`https://ui-avatars.com/api/?name=${item?.name}&background=random`}></Avatar>
                                </div>
                            }
                            title={item.name}
                            description={
                              <div className="prose prose-sm max-w-none text-[10px]" dangerouslySetInnerHTML={{ __html: item.description || '' }} />
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: "No results found" }}
                      className="max-h-48 overflow-auto"
                    />
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
        
        <Dropdown
          menu={{ items: notificationItems }}
          trigger={["click"]}
          open={notificationVisible}
          onOpenChange={setNotificationVisible}
        >
          <Badge count={4}>
            <BellOutlined
              className="text-xl cursor-pointer"
            />
          </Badge>
        </Dropdown>
        <Dropdown
          menu={{ items: avatarMenuItems }}
          trigger={["click"]}
          open={avatarMenuVisible}
          onOpenChange={setAvatarMenuVisible}
        >
          <Avatar
            size="small"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: "30px",
              height: "25px"
            }}
            className="cursor-pointer"
            icon={<UserOutlined />}
          />
        </Dropdown>
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';
export default TopBar;