// src/hooks/useTaskService.ts
import { useEffect, useState } from 'react';
import taskService from '@/app/service/task_service';
import { useAppSelector } from '../store/hook';

// Hook for accessing the task service and common state selectors
const useTaskService = () => {
  // Flag to track if initial data has been loaded
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Select commonly used data with safe defaults
  const currentUser = useAppSelector(state => state.users.currentUser);
  const workspaces = useAppSelector(state => state.workspaces.workspaces) || [];
  const currentWorkspaceId = useAppSelector(state => state.workspaces.currentWorkspace);
  const boards = useAppSelector(state => state.boards.boards) || [];
  const currentBoardId = useAppSelector(state => state.boards.currentBoard);
  
  // Derived data - handle potential undefined values
  const currentWorkspace = currentWorkspaceId ? workspaces.find(w => w.id === currentWorkspaceId) : undefined;
  const currentBoard = currentBoardId ? boards.find(b => b.id === currentBoardId) : undefined;
  const workspaceBoards = currentWorkspaceId ? boards.filter(b => b.workspaceId === currentWorkspaceId) : [];
  
  // Initialize mock data on first mount
  useEffect(() => {
    // Only initialize if not already done
    if (!isInitialized && workspaces.length === 0) {
      try {
        taskService.initializeMockData();
      } catch (error) {
        console.error('Error initializing mock data:', error);
      } finally {
        setIsInitialized(true);
      }
    } else if (workspaces.length > 0 && !isInitialized) {
      // Data already exists (from persistence), just mark as initialized
      setIsInitialized(true);
    }
  }, [isInitialized, workspaces.length]);
  
  // Return the task service and common state data
  return {
    // Service
    taskService,
    
    // Common state
    currentUser,
    workspaces,
    currentWorkspaceId,
    currentWorkspace,
    boards,
    currentBoardId,
    currentBoard,
    workspaceBoards,
    
    // Initialization state
    isInitialized
  };
};

export default useTaskService;