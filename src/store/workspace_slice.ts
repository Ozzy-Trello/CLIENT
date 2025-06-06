import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Workspace } from "../types/workspace";
import { Board } from "../types/board";
import { AnyList } from "../types/list";

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
      state.currentBoard = action.payload;
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