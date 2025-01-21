import { BellOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input, Layout } from "antd";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import logo from "../../assets/images/Logo_Ozzy_Clothing_png.png";

const TopBar: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  const notificationItems: MenuProps["items"] = [
    { key: "1", label: "Notification 1" },
    { key: "2", label: "Notification 2" },
    { key: "3", label: "Notification 3" },
  ];

  const avatarMenuItems: MenuProps["items"] = [
    { key: "profile", label: "Profile" },
    { key: "settings", label: "Settings" },
    { key: "logout", label: "Logout" },
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
        <Link href="/dashboard" passHref>
          <Image
            src={logo}
            alt="Ozzy Clothing Logo"
            style={{ width: "50px", height: "auto" }}
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
          prefix={<SearchOutlined />}
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
              style={{ fontSize: 20, cursor: "pointer", color: "white" }}
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
};

export default TopBar;
