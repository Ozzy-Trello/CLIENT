import { BellOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input } from "antd";
import Link from "next/link";
import React, { useState } from "react";
import logo from '@/app/assets/images/Logo_Ozzy_Clothing_png.png';
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/slice";

const TopBar: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const theme = useSelector(selectTheme);
  const {colors} = theme;

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
          <ImageDynamicContrast 
            imageSrc={logo} 
            rgbColor={`rgb(${colors.background})`}
            width={50}
            height={"auto"}
            alt={"Ozzy Clothing logo"}
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
          prefix={<i className="fi fi-rr-search"></i>}
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
};

export default TopBar;
