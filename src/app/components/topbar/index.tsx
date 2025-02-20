'use client';

import { BellOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input, Typography } from "antd";
import Link from "next/link";
import React, { use, useState } from "react";
import logo from '@/app/assets/images/Logo_Ozzy_Clothing_png.png';
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme, selectUser, setAccessToken, setUser } from "@/app/store/slice";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation"; // Changed from 'next/router'

const TopBar: React.FC = React.memo(() => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
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
    dispatch(setAccessToken(""));
    dispatch(setUser({}));
    router.push("/login");
  };

  const avatarMenuItems: MenuProps["items"] = [
    {
      key: "manage-profile",
      label: (
        <Link href="/workspace/account">
          <div className="fx-h-left-center">
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
        <div className="fx-h-left-center" onClick={handleLogout}>
          <i className="fi fi-rr-exit" />
          Logout
        </div>
      )
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "inherit",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        className="brand"
      >
        <Link href="/dashboard">
          <ImageDynamicContrast
            imageSrc={logo}
            rgbColor={`rgb(${colors.background})`}
            width={50}
            height="auto"
            alt="Ozzy Clothing logo"
          />
        </Link>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <Input
          placeholder="Search…"
          prefix={<i className="fi fi-rr-search" />}
          style={{
            width: 200,
            borderRadius: 4,
          }}
        />
        <Dropdown
          menu={{ items: notificationItems }}
          trigger={["click"]}
          open={notificationVisible}
          onOpenChange={setNotificationVisible}
        >
          <Badge count={4}>
            <BellOutlined
              style={{ fontSize: 20, cursor: "pointer" }}
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
              backgroundColor: "grey",
              cursor: "pointer",
            }}
            icon={<UserOutlined />}
          />
        </Dropdown>
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;