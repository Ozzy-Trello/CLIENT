'use client';

import { SkeletonTable } from "@/app/components/skeleton";
import { User } from "@/app/dto/types";
import { Avatar, Badge, Button, Menu, MenuProps, Table, Typography } from "antd";
import { useEffect, useState } from "react";
import AddUserModal from "./add_user_modal";
import { register } from "@/app/api/auth";
import { accountList } from "@/app/api/account";
import { useParams } from "next/navigation";
import { Account } from "@/app/dto/account";

type MenuItem = Required<MenuProps>['items'][number];
const items: MenuItem[] = [
  {
    key: 'menu-workspace-members',
    label: 'Workspace Members (0)', 
  },
  {
    key: 'menu-guest',
    label: 'Guest (0)',  
  },
  {
    key: 'menu-join-request',
    label: 'Join request (0)',  
  }
];

const TableMembers: React.FC<{dataSource?: Account[]}> = ({dataSource = []}) => {
  const columns = [
    {
      title: 'User',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: any) => {
        return (
          <div className="flex items-center gap-4">
            <Avatar size="small" src={record.avatar}></Avatar>
            <div>
              <Typography.Text strong={true}>{record.fullname}</Typography.Text>
              <div className="flex items-center">
                <Typography.Text>@{record.username}</Typography.Text>
                <i className="fi fi-ss-circle" style={{fontSize:"3px"}}></i>
                <Typography.Text>Last active recently</Typography.Text>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: '-',
      render: (_: any, record: any) => {
        return (
          <Button size="small"><i className="fi fi-rr-cross"></i> Remove</Button>
        );
      }
    },
  ];

  return (
    <Table dataSource={dataSource} columns={columns} style={{width: "100%"}} />
  )
}


const Members: React.FC = () => {

  const {workspaceId, boardId} = useParams();
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [data, setData] = useState<Account[] | []>([]);
  const [activeMenu, setActiveMenu] = useState<string>("menu-workspace-members");
  const [addUserModalVisible, setAddUserModalVisible] = useState<boolean>(false);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    setActiveMenu(e.key);
  };

  const openAddUserModal = () => {
    setAddUserModalVisible(true);
  }

  const closeAddUserModal = () => {
    setAddUserModalVisible(false);
  }

  useEffect(() => {
    const fecthData = async() => {
        const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
        const bId = Array.isArray(boardId) ? boardId[0] : boardId;
        const result = await accountList(wsId, bId);
        console.log(result);

        if (result && result.data) {
          setData(result.data || []);
        }
      }

    if (isFetching) {
      setTimeout(() => {
        fecthData();
        setIsFetching(false);
      }, 500)
    }

  }, [isFetching])

  return (
    <div className="page scrollable-page">
      <div className="flex justify-between items-center" style={{marginBottom: "10px"}}>
        <div className="section-title flex items-center gap-4">
          <Typography.Title level={4} className="m-0">Collaborators</Typography.Title>
          <Badge count="3/10"></Badge>
        </div>
        <Button size="small" onClick={openAddUserModal}><i className="fi fi-sr-user-add"></i> Add User</Button>
      </div>

      <div className="flex">
        <Menu
          style={{ width: 256 }}
          defaultSelectedKeys={['menu-workspace-members']}
          mode="inline"
          items={items}
          onClick={handleMenuClick}
        />
        <div style={{width: "100%"}}>
          { !isFetching && activeMenu === "menu-workspace-members" && (
            <TableMembers dataSource={data} />
          ) }

          { !isFetching && activeMenu === "menu-guest" && (
            <TableMembers dataSource={data} />
          ) }

          { !isFetching && activeMenu === "menu-join-request" && (
            <TableMembers dataSource={data} />
          ) }

          {/* skeleton */}
          { isFetching && (
            <SkeletonTable />
          ) }
        </div>
      </div>
      
      <AddUserModal visible={addUserModalVisible} onCancel={closeAddUserModal}/>
    </div>

  )
};

export default Members;
