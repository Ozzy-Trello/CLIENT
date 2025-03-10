// src/store/slices/boardSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Board, User, Color } from '@/app/dto/types';
import { generateId, formatDate, createGradientBackground } from '@/app/utils/general';
import { RootState } from '.';

interface BoardState {
  boards: Board[];
  currentBoard: string | null; // ID of the current board
  loading: boolean;
  error: string | null;
}

const initialState: BoardState = {
  boards: [],
  currentBoard: null,
  loading: false,
  error: null
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    // Add a new board
    addBoard: (state, action: PayloadAction<{ 
      workspaceId: string; 
      title: string; 
      cover?: string;
      user: User;
    }>) => {
      const { workspaceId, title, cover, user } = action.payload;
      const now = formatDate();
      
      const newBoard: Board = {
        id: generateId(),
        workspaceId,
        title,
        cover: cover || '',
        backgroundColor: createGradientBackground(),
        isStarred: false,
        visibility: 'workspace', // Default to workspace visibility
        createdBy: user,
        createdAt: now,
        updatedBy: user,
        upatedAt: now
      };
      
      state.boards.push(newBoard);
      state.currentBoard = newBoard.id;
    },
    
    // Update board
    updateBoard: (state, action: PayloadAction<Partial<Board> & { 
      id: string;
      user: User;
    }>) => {
      const { id, user, ...updates } = action.payload;
      const index = state.boards.findIndex(board => board.id === id);
      
      if (index !== -1) {
        state.boards[index] = { 
          ...state.boards[index], 
          ...updates,
          updatedBy: user,
          upatedAt: formatDate()
        };
      }
    },
    
    // Delete board
    deleteBoard: (state, action: PayloadAction<string>) => {
      state.boards = state.boards.filter(board => board.id !== action.payload);
      
      // If we deleted the current board, set current to another one for the same workspace if available
      if (state.currentBoard === action.payload && state.boards.length > 0) {
        const currentWorkspaceId = state.boards.find(b => b.id === state.currentBoard)?.workspaceId;
        const nextBoard = state.boards.find(b => b.workspaceId === currentWorkspaceId);
        state.currentBoard = nextBoard ? nextBoard.id : null;
      }
    },
    
    // Toggle star status
    toggleStarred: (state, action: PayloadAction<{ 
      boardId: string;
      user: User;
    }>) => {
      const { boardId, user } = action.payload;
      const board = state.boards.find(b => b.id === boardId);
      
      if (board) {
        board.isStarred = !board.isStarred;
        board.updatedBy = user;
        board.upatedAt = formatDate();
      }
    },
    
    // Change board background
    changeBoardBackground: (state, action: PayloadAction<{ 
      boardId: string;
      background: Color[] | string;
      user: User;
    }>) => {
      const { boardId, background, user } = action.payload;
      const board = state.boards.find(b => b.id === boardId);
      
      if (board) {
        board.backgroundColor = background;
        board.updatedBy = user;
        board.upatedAt = formatDate();
      }
    },
    
    // Set current board
    setCurrentBoard: (state, action: PayloadAction<string>) => {
      state.currentBoard = action.payload;
    },
    
    // For demo purposes, create some initial boards when a new workspace is created
    initializeMockBoards: (state, action: PayloadAction<{ 
      workspaceId: string;
      user: User;
    }>) => {
      const { workspaceId, user } = action.payload;
      
      // Check if workspace already has boards
      const hasBoards = state.boards.some(board => board.workspaceId === workspaceId);
      
      if (!hasBoards) {
        const now = formatDate();
        
        // Create mock boards for this workspace
        const mockBoards: Board[] = [
          {
            id: generateId(),
            workspaceId,
            title: 'Request Design',
            cover: '',
            backgroundColor: createGradientBackground(),
            isStarred: true,
            visibility: 'workspace',
            createdBy: user,
            createdAt: now,
            updatedBy: user,
            upatedAt: now
          },
        ];
        
        state.boards.push(...mockBoards);
        
        // Set the first board as current
        if (state.currentBoard === null && mockBoards.length > 0) {
          state.currentBoard = mockBoards[0].id;
        }
      }
    }
  }
});

// Selector to get boards for a specific workspace
export const selectWorkspaceBoards = (state: RootState, workspaceId: string) => {
  return state.boards.boards.filter((board: Board) => board.workspaceId === workspaceId);
};

// Selector to get the current board
export const selectCurrentBoard = (state: RootState) => {
  return state.boards.currentBoard 
    ? state.boards.boards.find((board: Board) => board.id === state.boards.currentBoard) 
    : null;
};

export const { 
  addBoard, 
  updateBoard, 
  deleteBoard, 
  toggleStarred, 
  changeBoardBackground, 
  setCurrentBoard, 
  initializeMockBoards 
} = boardSlice.actions;

export default boardSlice.reducer;