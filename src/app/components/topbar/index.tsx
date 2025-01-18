import React, { useState } from 'react';
import Link from 'next/link';
import { Layout, Input, Badge, Avatar, Menu, Dropdown, Typography } from 'antd';
import Image from 'next/image';
import { SearchOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';
import logo from "../../assets/images/Logo_Ozzy_Clothing_png.png";
import { inherits } from 'util';

const { Header } = Layout;


const TopBar: React.FC = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);

  const notifications = (
    <Menu>
      <Menu.Item key="1">Notification 1</Menu.Item>
      <Menu.Item key="2">Notification 2</Menu.Item>
      <Menu.Item key="3">Notification 3</Menu.Item>
    </Menu>
  );

  const avatarMenu = (
    <Menu>
      <Menu.Item key="profile">Profile</Menu.Item>
      <Menu.Item key="settings">Settings</Menu.Item>
      <Menu.Item key="logout">Logout</Menu.Item>
    </Menu>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: "space-between",
        height: "inherit"
      }}
    >
      
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} className='brand'>
        <Link href="/dashboard" passHref>
          <Image src={logo} alt="Ozzy Clothing Logo" style={{width: "50px", height: "auto"}} />
        </Link>
      </div>

      <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: "20px"
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
          overlay={notifications}
          trigger={['click']}
          visible={notificationVisible}
          onVisibleChange={setNotificationVisible}
        >
          <Badge count={4}>
            <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: "white" }} />
          </Badge>
        </Dropdown>

        <Dropdown
          overlay={avatarMenu}
          trigger={['click']}
          visible={avatarMenuVisible}
          onVisibleChange={setAvatarMenuVisible}
        >
          <Avatar
            size="small"
            style={{
              backgroundColor: 'grey',
              cursor: 'pointer',
            }}
            icon={<UserOutlined />}
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default TopBar;
