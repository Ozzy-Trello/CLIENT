'use client';

import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { Board } from "@/app/dto/types";
import { boards } from "@/dummy-data";
import { Avatar, Button, Menu, Tooltip, Typography, Layout, Skeleton, Space } from "antd";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trello, Users } from "lucide-react";
import "./style.css";
import ModalCreateBoard from "../modal-create-board";
import { useSelector } from "react-redux";
import { selectSelectedWorkspace, setSelectedBoard } from "@/app/store/slice";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";


const { Sider } = Layout;

const Sidebar: React.FC = React.memo(() => {
  const { collapsed, toggleSidebar, siderWide, siderSmall } = useWorkspaceSidebar();
  const [boardList, setBoardList] = useState<Board[]>([]);
  const [menus, setMenus] = useState<{ key: string; label: React.ReactNode; icon: React.ReactNode; }[]>([]);
  const [allMenus, setAllMenus] = useState<{ key: string; label: React.ReactNode; icon: React.ReactNode; }[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [openCreateBoardModal, setOpenCreateBoardModal] = useState<boolean>(false);
  const selectedWorkspace = useSelector(selectSelectedWorkspace);
  const router = useRouter();
  const dispatch = useDispatch();
  
  const handleOpenBoardModal = () => {
    setOpenCreateBoardModal(true);
  }

  const handleSelectBoardItem = (board: Board) => {
    dispatch(setSelectedBoard(board));
  }

  useEffect(() => {
    const menus = [
      {
        key: "menu-board",
        label: (
          <Link className="fullwidth" href={`/workspace/${selectedWorkspace}/board`}>
            Boards
          </Link>
        ),
        icon: <Trello size={16}/>,
      },
      {
        key: "menu-members",
        label: (
          <Link className="fullwidth" href={`/workspace/${selectedWorkspace}/members`}>
            Members
          </Link>
        ),
        icon: <Users size={16} />,
      }
    ];

    setMenus(menus);
  }, [selectedWorkspace])

  useEffect(() => {
    const fetchBoardsList = () => {
      const filteredBoards = boards.filter(item => item.workspaceId == selectedWorkspace);
      setBoardList(filteredBoards);
    }

    setTimeout(function(){
      fetchBoardsList();
      setIsFetching(false);
    }, 1000);

  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace === "") {
      // If no workspace is selected, only show the base menus without boards
      setAllMenus([...menus]);
      return;
    }
    
    // If a workspace is selected, add the boards section
    const updateMenu = () => {
      const boardMenus = [];
      
      // Add the "Your boards" header item with an empty icon to satisfy the type
      boardMenus.push({
        key: `menu-your-boards`,
        event: 'none',
        disabled: true,
        label: (
          <div className={collapsed ? "menu-group-title fx-h-sb-center d-none" : "menu-group-title fx-h-sb-center"}>
            <Typography.Text strong>Your boards</Typography.Text>
            <Button size="small" onClick={handleOpenBoardModal}>+</Button>
          </div>
        ),
        icon: <span></span>
      });
      
      // Add each board as a menu item
      boardList?.forEach((board) => {
        const boardMenu = {
          key: `menu-board-${board.id}`,
          label: (
            <Link className="fullwidth" href={`/workspace/${selectedWorkspace}/board/${board.id}`} onClick={() => {handleSelectBoardItem(board)}}>
              {board.title}
            </Link>
          ),
          icon: <span><Avatar shape="square" src={board?.cover} size={"small"}/></span>,
        }
        boardMenus.push(boardMenu);
      });
     
      // Update the items state with base menus plus board menus
      setAllMenus([...menus, ...boardMenus]);
    };
     
    // Call updateMenu when we have a selected workspace
    updateMenu();
    
  }, [selectedWorkspace, boardList, menus, collapsed]);

  return (
    <div 
      className="sidebar-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Sider
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        collapsed={collapsed}
        style={{
          height: '100%',
          position: 'fixed',
          left: 0,
          top: 45,
          overflow: 'visible',
          backgroundColor: '#fff',
          transition: 'width 0.2s ease, transform 0.2s ease',
          width: collapsed ? siderSmall : siderWide,
          zIndex: 101
        }}
        width={collapsed ? siderSmall : siderWide}
        collapsedWidth={12}
        trigger={null}
      >
        <div className="sidebar-content" style={{ opacity: collapsed ? 0 : 1 }}>
          {!collapsed && (
            <>
              <div className="sidebar-title">
                <div className="fx-h-left-center">
                  <Avatar shape="square" size={"small"} />
                  <Typography>{selectedWorkspace}</Typography>
                </div>
              </div>
              
              <Menu
                mode="inline"
                defaultSelectedKeys={["1"]}
                style={{ borderRight: 0 }}
                items={allMenus}
              />

              {isFetching && [1,2,3].map((item) => (
                <Space key={`loader-space-${item}`} style={{margin: "0px 0px 10px 25px"}}>
                  <Skeleton.Avatar active={isFetching} size={"small"} shape={"square"} />
                  <Skeleton.Input active={isFetching} size={"small"} />
                </Space>
              ))}
            </>
          )}
        </div>
      </Sider>

      <Tooltip 
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        placement="right"
      >
        <Button
          className={`sidebar-toggle ${isHovered ? 'hovered' : ''}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          size="small"
          type="text"
          icon={collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          onClick={toggleSidebar}
          style={{
            left: collapsed ? `calc(${siderSmall}px - 10px)` : `calc(${siderWide}px - 30px)`,
            zIndex: 102
          }}
        />
      </Tooltip>
      <ModalCreateBoard open={openCreateBoardModal} setOpen={setOpenCreateBoardModal} />
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;