import React, { createContext, useContext, ReactNode } from 'react';
import { Board } from '../types/board';
import { useBoardPermissions } from '../hooks/useBoardPermissions';

interface BoardPermissionsContextType {
  // Raw permission data
  permissions: any;
  hasFullAccess: boolean;
  
  // Board permissions
  canCreateBoard: () => boolean;
  canReadBoard: () => boolean;
  canUpdateBoard: () => boolean;
  canDeleteBoard: () => boolean;
  
  // List permissions
  canCreateList: () => boolean;
  canReadList: () => boolean;
  canUpdateList: () => boolean;
  canDeleteList: () => boolean;
  canMoveList: () => boolean;
  canArchiveList: () => boolean;
  
  // Card permissions
  canCreateCard: () => boolean;
  canReadCard: () => boolean;
  canUpdateCard: () => boolean;
  canDeleteCard: () => boolean;
  canMoveCard: () => boolean;
  canArchiveCard: () => boolean;
  canCopyCard: () => boolean;
  canMirrorCard: () => boolean;
  
  // Card management
  canManageCardMembers: () => boolean;
  canManageCardLabels: () => boolean;
  canManageCardDates: () => boolean;
  canManageCardAttachments: () => boolean;
  canManageCardChecklists: () => boolean;
  canManageCardCustomFields: () => boolean;
  canManageCardLocation: () => boolean;
  
  // Board management
  canManageBoardSettings: () => boolean;
  canManageBoardAutomation: () => boolean;
  canManageBoardCustomFields: () => boolean;
  canManageBoardLabels: () => boolean;
  
  // View permissions
  canViewArchivedItems: () => boolean;
  
  // Comment permissions
  canCommentOnCard: () => boolean;
  
  // Share/Export permissions
  canShareCard: () => boolean;
  canGenerateQR: () => boolean;
  canExportBoard: () => boolean;
  
  // Utility functions
  hasAnyBoardPermission: () => boolean;
  hasAnyListPermission: () => boolean;
  hasAnyCardPermission: () => boolean;
}

const BoardPermissionsContext = createContext<BoardPermissionsContextType | null>(null);

interface BoardPermissionsProviderProps {
  children: ReactNode;
  board: Board | null | undefined;
}

export const BoardPermissionsProvider: React.FC<BoardPermissionsProviderProps> = ({ children, board }) => {
  const permissions = useBoardPermissions(board);

  return (
    <BoardPermissionsContext.Provider value={permissions}>
      {children}
    </BoardPermissionsContext.Provider>
  );
};

export const useBoardPermissionsContext = (): BoardPermissionsContextType => {
  const context = useContext(BoardPermissionsContext);
  if (!context) {
    throw new Error('useBoardPermissionsContext must be used within a BoardPermissionsProvider');
  }
  return context;
};