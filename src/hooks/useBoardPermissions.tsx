import { Board, FineGrainedPermissions } from "../types/board";
import { usePermissions } from "./account";

/**
 * Hook for board-specific permission checks using fine-grained permissions
 * This replaces global permission checks with board-specific ones
 */
export function useBoardPermissions(board?: Board | null) {
  const { isSuperAdmin } = usePermissions();

  // Get fine-grained permissions from board data
  const permissions: FineGrainedPermissions | null =
    board?.userPermissions || null;

  // If no permissions data or user is super admin, grant all permissions
  const hasFullAccess = isSuperAdmin() || !permissions;

  // Board permissions
  const canCreateBoard = () =>
    hasFullAccess || permissions?.board?.create || false;
  const canReadBoard = () => hasFullAccess || permissions?.board?.read || false;
  const canUpdateBoard = () =>
    hasFullAccess || permissions?.board?.update || false;
  const canDeleteBoard = () =>
    hasFullAccess || permissions?.board?.delete || false;

  // List permissions
  const canCreateList = () =>
    hasFullAccess || permissions?.list?.create || false;
  const canReadList = () => hasFullAccess || permissions?.list?.read || false;
  const canUpdateList = () =>
    hasFullAccess || permissions?.list?.update || false;
  const canDeleteList = () =>
    hasFullAccess || permissions?.list?.delete || false;
  const canMoveList = () => hasFullAccess || permissions?.list?.move || false;

  // Card permissions
  const canCreateCard = () =>
    hasFullAccess || permissions?.card?.create || false;
  const canReadCard = () => hasFullAccess || permissions?.card?.read || false;
  const canUpdateCard = () =>
    hasFullAccess || permissions?.card?.update || false;
  const canDeleteCard = () =>
    hasFullAccess || permissions?.card?.delete || false;
  const canMoveCard = () => hasFullAccess || permissions?.card?.move || false;

  // Derived permissions for specific actions
  const canArchiveCard = () => canUpdateCard();
  const canCopyCard = () => canCreateCard();
  const canMirrorCard = () => canCreateCard();
  const canArchiveList = () => canUpdateList();

  // Card management permissions
  const canManageCardMembers = () => canUpdateCard();
  const canManageCardLabels = () => canUpdateCard();
  const canManageCardDates = () => canUpdateCard();
  const canManageCardAttachments = () => canUpdateCard();
  const canManageCardChecklists = () => canUpdateCard();
  const canManageCardCustomFields = () => canUpdateCard();
  const canManageCardLocation = () => canUpdateCard();

  // Board management permissions
  const canManageBoardSettings = () => canUpdateBoard();
  const canManageBoardAutomation = () => canUpdateBoard();
  const canManageBoardCustomFields = () => canUpdateBoard();
  const canManageBoardLabels = () => canUpdateBoard();

  // View permissions
  const canViewArchivedItems = () => canReadCard() && canReadList();

  // Comment permissions
  const canCommentOnCard = () => canUpdateCard();

  // Share and export permissions
  const canShareCard = () => canReadCard();
  const canGenerateQR = () => canReadCard();
  const canExportBoard = () => canReadBoard();

  return {
    // Raw permission data
    permissions,
    hasFullAccess,

    // Board permissions
    canCreateBoard,
    canReadBoard,
    canUpdateBoard,
    canDeleteBoard,

    // List permissions
    canCreateList,
    canReadList,
    canUpdateList,
    canDeleteList,
    canMoveList,
    canArchiveList,

    // Card permissions
    canCreateCard,
    canReadCard,
    canUpdateCard,
    canDeleteCard,
    canMoveCard,
    canArchiveCard,
    canCopyCard,
    canMirrorCard,

    // Card management
    canManageCardMembers,
    canManageCardLabels,
    canManageCardDates,
    canManageCardAttachments,
    canManageCardChecklists,
    canManageCardCustomFields,
    canManageCardLocation,

    // Board management
    canManageBoardSettings,
    canManageBoardAutomation,
    canManageBoardCustomFields,
    canManageBoardLabels,

    // View permissions
    canViewArchivedItems,

    // Comment permissions
    canCommentOnCard,

    // Share/Export permissions
    canShareCard,
    canGenerateQR,
    canExportBoard,

    // Utility functions
    hasAnyBoardPermission: () =>
      canCreateBoard() ||
      canReadBoard() ||
      canUpdateBoard() ||
      canDeleteBoard(),
    hasAnyListPermission: () =>
      canCreateList() ||
      canReadList() ||
      canUpdateList() ||
      canDeleteList() ||
      canMoveList(),
    hasAnyCardPermission: () =>
      canCreateCard() ||
      canReadCard() ||
      canUpdateCard() ||
      canDeleteCard() ||
      canMoveCard(),
  };
}
