"use client";
import { BellOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input, Typography } from "antd";
import Link from "next/link";
import React, { useState } from "react";
import logo from "@/app/assets/images/Logo_Ozzy_Clothing_png.png";
import { useDispatch, useSelector } from "react-redux";
import ImageDynamicContrast from "@components/image-dynamic-contrast";
import { WorkspaceSelection } from "@components/selection";
import { selectTheme, selectUser, setUser } from "@store/app_slice";
import { useRouter } from "next/router";

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const theme = useSelector(selectTheme);
  const { colors } = theme;
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
    // dispatch(setAccessToken(""));
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

      <div className="flex items-center gap-5 w-100">
        <Input
          placeholder="Search…"
          prefix={<i className="fi fi-rr-search" />}
          className="w-[200px] rounded"
        />
        <Dropdown
          menu={{ items: notificationItems }}
          trigger={["click"]}
          open={notificationVisible}
          onOpenChange={setNotificationVisible}
        >
          <Badge count={4}>
            <BellOutlined className="text-xl cursor-pointer" />
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
    </div>
  );
});

TopBar.displayName = "TopBar";
export default TopBar;
