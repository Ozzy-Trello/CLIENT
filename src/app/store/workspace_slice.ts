import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AnyList, Board, List, Workspace } from "../dto/types";

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  boards: Board[];
  currentBoard: Board | null;
  lists: AnyList[];
}

const initialWorkspaceState: WorkspaceState = {
  currentWorkspace: null,
  boards: [],
  currentBoard: null,
  lists: []
};

const workspaceSlice = createSlice({
  name: 'workspaceSlice',
  initialState: initialWorkspaceState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<any>) => {
      state.currentWorkspace = action.payload;
    },
    setBoards: (state, action: PayloadAction<any>) => {
      state.boards = action.payload;
    },
    setCurrentBoard: (state, action: PayloadAction<any>) => {
      state.currentWorkspace = action.payload;
    },
    setLists: (state, action: PayloadAction<any>) => {
      state.lists = action.payload;
    }
  }
});

export const { setCurrentWorkspace, setBoards, setCurrentBoard } = workspaceSlice.actions;
export default workspaceSlice.reducer;

export interface RootWorkspaceState {
  workspaceState: WorkspaceState;
}

export function selectCurrentWorkspace(state: RootWorkspaceState) {
  return state.workspaceState.currentWorkspace;
}

export function selectBoards(state: RootWorkspaceState) {
  return state.workspaceState.boards;
}

export function selectCurrentBoard(state: RootWorkspaceState) {
  return state.workspaceState.currentBoard;
}

export function selectLists(state: RootWorkspaceState) {
  return state.workspaceState.lists;
}