'use client';

import { useWorkspaceSidebar } from "@/app/provider/workspace-sidebar-context";
import { Board } from "@/app/dto/types";
import { Avatar, Button, Menu, Tooltip, Typography, Layout, Skeleton, Space } from "antd";
import Link from "next/link";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Trello, Users } from "lucide-react";
import ModalCreateBoard from "../modal-create-board";
import { setSelectedBoard } from "@/app/store/app_slice";
import { useDispatch } from "react-redux";
import useTaskService from "@/app/hooks/task";
import { MenuProps } from 'antd';

const { Sider } = Layout;
type MenuItem = Required<MenuProps>['items'][number];

const Sidebar = () => {
  const { collapsed, toggleSidebar, siderWide, siderSmall } = useWorkspaceSidebar();
  const [allMenus, setAllMenus] = useState<MenuItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openCreateBoardModal, setOpenCreateBoardModal] = useState<boolean>(false);
  const dispatch = useDispatch();
  const { currentWorkspace, workspaceBoards } = useTaskService();
  
  // Use refs to avoid dependency changes in useEffect
  const prevWorkspaceIdRef = useRef<string | null>(null);
  const prevBoardsLengthRef = useRef<number>(0);
  const prevCollapsedRef = useRef<boolean>(collapsed);
  
  // Memoize handlers to prevent them from changing on every render
  const handleOpenBoardModal = useCallback(() => {
    setOpenCreateBoardModal(true);
  }, []);

  const handleSelectBoardItem = useCallback((board: Board) => {
    dispatch(setSelectedBoard(board));
  }, [dispatch]);
  
  // Memoize the base menus
  const baseMenus = useMemo<MenuItem[]>(() => {
    if (!currentWorkspace) return [];
    
    return [
      {
        key: "menu-board",
        label: (
          <Link className="block w-full" href={`/workspace/${currentWorkspace.id}/board`}>
            Boards
          </Link>
        ),
        icon: <Trello size={16}/>,
      },
      {
        key: "menu-members",
        label: (
          <Link className="block w-full" href={`/workspace/${currentWorkspace.id}/members`}>
            Members
          </Link>
        ),
        icon: <Users size={16} />,
      }
    ];
  }, [currentWorkspace]);
  
  // Build menu items separately to avoid frequent render cycles
  useEffect(() => {
    // Skip if nothing significant has changed
    const currentWorkspaceId = currentWorkspace?.id || null;
    const currentBoardsLength = workspaceBoards?.length || 0;
    
    if (
      currentWorkspaceId === prevWorkspaceIdRef.current &&
      currentBoardsLength === prevBoardsLengthRef.current &&
      collapsed === prevCollapsedRef.current &&
      allMenus.length > 0
    ) {
      return;
    }
    
    // Update refs for next comparison
    prevWorkspaceIdRef.current = currentWorkspaceId;
    prevBoardsLengthRef.current = currentBoardsLength;
    prevCollapsedRef.current = collapsed;
    
    // Build menus only when needed
    const buildMenus = async () => {
      setIsFetching(true);
      
      try {
        // If no workspace, just use base menus
        if (!currentWorkspace) {
          setAllMenus(baseMenus);
          return;
        }
        
        // Start with base menus
        const fullMenus: MenuItem[] = [...baseMenus];
        
        // Add header for boards section
        if (baseMenus.length > 0) {
          fullMenus.push({
            key: 'menu-your-boards',
            disabled: true,
            label: (
              <div className={collapsed ? "hidden" : "flex items-center justify-between"}>
                <Typography.Text strong>Your boards</Typography.Text>
                <Button 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenBoardModal();
                  }}
                >
                  +
                </Button>
              </div>
            ),
            icon: <span></span>
          });
        }
        
        // Add board items if we have any
        if (workspaceBoards && workspaceBoards.length > 0 && currentWorkspace) {
          workspaceBoards.forEach((board) => {
            fullMenus.push({
              key: `menu-board-${board.id}`,
              label: (
                <Link 
                  className="block w-full" 
                  href={`/workspace/${currentWorkspace.id}/board/${board.id}`} 
                  onClick={() => handleSelectBoardItem(board)}
                >
                  {board.title}
                </Link>
              ),
              icon: <span><Avatar shape="square" src={board?.cover || `https://ui-avatars.com/api/?name=${board?.title}&background=random`} size={"small"}/></span>,
            });
          });
        }
        
        // Only update state if values have actually changed
        setAllMenus(prevMenus => {
          // Simple length check to avoid deep comparison
          if (prevMenus.length !== fullMenus.length) {
            return fullMenus;
          }
          // If lengths match, check if any keys have changed
          const prevKeys = prevMenus.map(item => item?.key);
          const newKeys = fullMenus.map(item => item?.key);
          if (JSON.stringify(prevKeys) !== JSON.stringify(newKeys)) {
            return fullMenus;
          }
          return prevMenus;
        });
      } finally {
        setIsFetching(false);
      }
    };
    
    // Execute the menu building
    buildMenus();
  }, [baseMenus, currentWorkspace, workspaceBoards, collapsed, handleOpenBoardModal, handleSelectBoardItem]);

  // Render the sidebar
  return (
    <div 
      className="relative h-full "
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{width: collapsed ? siderSmall : siderWide}}
    >
      <Sider
        className={`transition-all duration-200 ease-in-out border-r border-gray-200 ${collapsed ? 'w-3 scrollbar-none' : ''}`}
        collapsed={collapsed}
        style={{
          height: '100%',
          position: 'fixed',
          left: 0,
          top: 45,
          overflow: 'visible',
          backgroundColor: '#fff',
          zIndex: 101
        }}
        width={collapsed ? siderSmall : siderWide}
        collapsedWidth={12}
        trigger={null}
      >
        <div className="transition-opacity duration-200 ease-in-out" style={{ opacity: collapsed ? 0 : 1 }}>
          {!collapsed && (
            <>
              <div className="flex justify-between items-center p-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Avatar shape="square" size={"small"}>
                    {currentWorkspace ? currentWorkspace.name.charAt(0) : ''}
                  </Avatar>
                  <Typography className="font-semibold">{currentWorkspace?.name}</Typography>
                </div>
              </div>
              
              <Menu
                mode="inline"
                defaultSelectedKeys={["1"]}
                style={{ borderRight: 0 , fontSize: "12px"}}
                items={allMenus}
                className="[&_.ant-menu-item]:my-1 [&_.ant-menu-item-icon]:flex [&_.ant-menu-item-icon]:items-center text-[10px]"
              />

              {isFetching && [1,2,3].map((item) => (
                <Space key={`loader-space-${item}`} className="mx-0 my-0 mb-2.5 ml-6">
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
          className={`absolute top-[58px] flex items-center justify-center rounded-full w-6 h-6 shadow-md border border-gray-200 p-0 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-lg ${isHovered ? 'scale-105' : ''}`}
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
};

// Use React.memo with custom comparison to prevent unnecessary rerenders
export default React.memo(Sidebar, (prevProps, nextProps) => {
  // These are object identity checks, not deep equality
  return true; // Always consider equal since we don't have props
});