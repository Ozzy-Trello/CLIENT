import { BellOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Badge, Dropdown, Input, Typography } from "antd";
import Link from "next/link";
import React, { useState } from "react";
import logo from '@/app/assets/images/Logo_Ozzy_Clothing_png.png';
import ImageDynamicContrast from "../image-dynamic-contrast";
import { useSelector } from "react-redux";
import { selectTheme } from "@/app/store/slice";
import { useLogout } from "@/app/login/page";



const TopBar: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const theme = useSelector(selectTheme);
  const {colors} = theme;
  const logout = useLogout();

  const notificationItems: MenuProps["items"] = [
    { key: "1", label: "Notification 1" },
    { key: "2", label: "Notification 2" },
    { key: "3", label: "Notification 3" },
  ];

  const avatarMenuItems: MenuProps["items"] = [
    { 
      key: "manage-profile", 
      label: (
        <Link href={"/account"}>
          <div className="fx-h-left-center">
            <Avatar size={"small"}></Avatar>
            <div>
              <Typography.Title level={5} className="m-0">John Doe</Typography.Title>
              <Typography.Text>johndoe@email.com</Typography.Text>
            </div>
          </div>
        </Link>
      ) 
    },
    { 
      key: "logout", 
      label: (
        <div className="fx-h-left-center" onClick={logout}>
          <i className="fi fi-rr-exit"></i>
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
