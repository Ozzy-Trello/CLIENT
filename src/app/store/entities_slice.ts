// slices/entitiesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, Board, List, AnyList, Card } from '@/app/dto/types';

interface EntitiesState {
  workspaces: Workspace[];
  boards: Board[];
  lists: AnyList[];
  cards: Card[];
}

const initialState: EntitiesState = {
  workspaces: [],
  boards: [],
  lists: [],
  cards: [],
};

const entitiesSlice = createSlice({
  name: 'entities',
  initialState,
  reducers: {
    // Create a new workspace
    createWorkspace(state, action: PayloadAction<{ name: string; description: string }>) {
      const newWorkspace: Workspace = {
        id: uuidv4(),
        name: action.payload.name,
        description: action.payload.description,
      };
      state.workspaces.push(newWorkspace);
    },

    // Create a new board within a workspace
    createBoard(
      state,
      action: PayloadAction<{
        workspaceId: string;
        title: string;
        cover: string;
        backgroundColor: string;
        visibility: string;
      }>
    ) {
      const newBoard: Board = {
        id: uuidv4(),
        workspaceId: action.payload.workspaceId,
        title: action.payload.title,
        cover: action.payload.cover,
        backgroundColor: action.payload.backgroundColor,
        isStarred: false,
        visibility: action.payload.visibility,
        createdAt: new Date().toISOString(),
        upatedAt: new Date().toISOString(),
      };
      state.boards.push(newBoard);
    },

    // Create a new list/column within a board
    createList(
      state,
      action: PayloadAction<{
        boardId: string;
        title: string;
        type: 'regular';
        position: number;
      }>
    ) {
      const newList: List = {
        id: uuidv4(),
        // boardId: action.payload.boardId,
        title: action.payload.title,
        cover: '',
        type: action.payload.type,
        cardIds: [],
        position: action.payload.position,
      };
      state.lists.push(newList);
    },

    // Create a new card within a list/column
    createCard(
      state,
      action: PayloadAction<{ listId: string; title: string; description?: string }>
    ) {
      const newCard: Card = {
        id: uuidv4(),
        title: action.payload.title,
        description: action.payload.description,
        cover: null,
        attachments: [],
        labels: [],
        members: [],
        customFields: [],
        time: { inList: '0', onBoard: '0' },
        activity: [],
        checklists: [],
        isWatched: false,
        isArchived: false,
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.cards.push(newCard);
      // Update the corresponding list by adding the new card ID.
      const list = state.lists.find((l) => l.id === action.payload.listId);
      if (list) {
        list.cardIds.push(newCard.id);
      }
    },

    // Move a card from one list/column to another (or reorder within the same list)
    moveCard(
      state,
      action: PayloadAction<{
        cardId: string;
        fromListId: string;
        toListId: string;
        newPosition: number;
      }>
    ) {
      const sourceList = state.lists.find((l) => l.id === action.payload.fromListId);
      const targetList = state.lists.find((l) => l.id === action.payload.toListId);
      if (sourceList && targetList) {
        // Remove card from source list
        sourceList.cardIds = sourceList.cardIds.filter((id) => id !== action.payload.cardId);
        // Insert card into target list at the new position
        targetList.cardIds.splice(action.payload.newPosition, 0, action.payload.cardId);
      }
    },
  },
});

export const { createWorkspace, createBoard, createList, createCard, moveCard } = entitiesSlice.actions;
export default entitiesSlice.reducer;
