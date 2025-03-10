// src/store/slices/workspaceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Workspace } from '@/app/dto/types';
import { generateId } from '@/app/utils/general';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: string | null; // ID of the current workspace
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    // Add a new workspace
    addWorkspace: (state, action: PayloadAction<Omit<Workspace, 'id'>>) => {
      const newWorkspace: Workspace = {
        ...action.payload,
        id: generateId()
      };
      
      state.workspaces.push(newWorkspace);
      
      // Set as current workspace if we don't have one yet
      if (state.currentWorkspace === null) {
        state.currentWorkspace = newWorkspace.id;
      }
    },
    
    // Update workspace
    updateWorkspace: (state, action: PayloadAction<Partial<Workspace> & { id: string }>) => {
      const index = state.workspaces.findIndex(workspace => workspace.id === action.payload.id);
      
      if (index !== -1) {
        state.workspaces[index] = { ...state.workspaces[index], ...action.payload };
      }
    },
    
    // Delete workspace
    deleteWorkspace: (state, action: PayloadAction<string>) => {
      state.workspaces = state.workspaces.filter(workspace => workspace.id !== action.payload);
      
      // If we deleted the current workspace, set current to another one if available
      if (state.currentWorkspace === action.payload) {
        state.currentWorkspace = state.workspaces.length > 0 ? state.workspaces[0].id : null;
      }
    },
    
    // Set current workspace
    setCurrentWorkspace: (state, action: PayloadAction<string>) => {
      state.currentWorkspace = action.payload;
    },
    
    // For demo purposes, create some initial workspaces
    initializeMockWorkspaces: (state) => {
      if (state.workspaces.length === 0) {
        const mockWorkspaces: Workspace[] = [
          {
            id: generateId(),
            name: 'Ozzy Operation Workflow',
            description: 'Workspace for all operation workflow'
          },
          // {
          //   id: generateId(),
          //   name: 'Marketing',
          //   description: 'Marketing campaigns and initiatives'
          // },
          // {
          //   id: generateId(),
          //   name: 'Design Team',
          //   description: 'Design projects and resources'
          // }
        ];
        
        state.workspaces = mockWorkspaces;
        state.currentWorkspace = mockWorkspaces[0].id;
      }
    }
  }
});

export const { 
  addWorkspace, 
  updateWorkspace, 
  deleteWorkspace, 
  setCurrentWorkspace, 
  initializeMockWorkspaces 
} = workspaceSlice.actions;

export default workspaceSlice.reducer;