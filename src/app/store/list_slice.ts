import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { List, FilterList, AnyList } from '@/app/dto/types';
import { generateId, calculatePosition, reorderItems } from '@/app/utils/general';
import { RootState } from '.';

interface ListState {
  lists: AnyList[];
  loading: boolean;
  error: string | null;
}

const initialState: ListState = {
  lists: [],
  loading: false,
  error: null
};

const listSlice = createSlice({
  name: 'list',
  initialState,
  reducers: {
    // Add a regular list
    addList: (state, action: PayloadAction<{ 
      boardId: string; 
      title: string;
      cover?: string;
    }>) => {
      const { boardId, title, cover } = action.payload;
      
      // Get all lists for this board to calculate position
      const boardLists = state.lists.filter(list => list.id.startsWith(boardId));
      
      const newList: List = {
        id: `${boardId}-list-${generateId()}`, // Prefix with boardId for easier filtering
        title,
        cover: cover || '',
        type: 'regular',
        cardIds: [],
        position: calculatePosition(boardLists)
      };
      
      state.lists.push(newList);
    },
    
    // Add a filter list
    addFilterList: (state, action: PayloadAction<{ 
      boardId: string; 
      title: string;
      filterCriteria?: any;
    }>) => {
      const { boardId, title, filterCriteria } = action.payload;
      
      // Get all lists for this board to calculate position
      const boardLists = state.lists.filter(list => list.id.startsWith(boardId));
      
      const newList: FilterList = {
        id: `${boardId}-filter-${generateId()}`, // Prefix with boardId for easier filtering
        title,
        type: 'filter',
        cardIds: [], // Will be populated based on filter criteria
        position: calculatePosition(boardLists),
        filterCriteria
      };
      
      state.lists.push(newList);
    },
    
    // Update a list
    updateList: (state, action: PayloadAction<Partial<AnyList> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      const index = state.lists.findIndex(list => list.id === id);
      
      if (index !== -1) {
        state.lists[index] = { ...state.lists[index], ...updates };
      }
    },
    
    // Delete a list
    deleteList: (state, action: PayloadAction<string>) => {
      state.lists = state.lists.filter(list => list.id !== action.payload);
    },
    
    // Reorder lists within a board
    reorderLists: (state, action: PayloadAction<{ 
      boardId: string;
      sourceIndex: number;
      destinationIndex: number;
    }>) => {
      const { boardId, sourceIndex, destinationIndex } = action.payload;
      
      // Get lists for this board
      const boardLists = state.lists.filter(list => list.id.startsWith(boardId));
      
      // Reorder the lists
      const reorderedLists = reorderItems(boardLists, sourceIndex, destinationIndex);
      
      // Update the state with the reordered lists
      reorderedLists.forEach(list => {
        const index = state.lists.findIndex(l => l.id === list.id);
        if (index !== -1) {
          state.lists[index] = list;
        }
      });
    },
    
    // Add a card ID to a list
    addCardToList: (state, action: PayloadAction<{ 
      listId: string;
      cardId: string;
    }>) => {
      const { listId, cardId } = action.payload;
      const list = state.lists.find(list => list.id === listId);
      
      if (list) {
        list.cardIds.push(cardId);
      }
    },
    
    // Remove a card ID from a list
    removeCardFromList: (state, action: PayloadAction<{ 
      listId: string;
      cardId: string;
    }>) => {
      const { listId, cardId } = action.payload;
      const list = state.lists.find(list => list.id === listId);
      
      if (list) {
        list.cardIds = list.cardIds.filter(id => id !== cardId);
      }
    },
    
    // Move a card between lists
    moveCard: (state, action: PayloadAction<{ 
      sourceListId: string;
      destinationListId: string;
      cardId: string;
    }>) => {
      const { sourceListId, destinationListId, cardId } = action.payload;
      
      // Remove from source list
      const sourceList = state.lists.find(list => list.id === sourceListId);
      if (sourceList) {
        sourceList.cardIds = sourceList.cardIds.filter(id => id !== cardId);
      }
      
      // Add to destination list
      const destinationList = state.lists.find(list => list.id === destinationListId);
      if (destinationList) {
        destinationList.cardIds.push(cardId);
      }
    },
    
    // Reorder cards within a list
    reorderCards: (state, action: PayloadAction<{ 
      listId: string;
      sourceIndex: number;
      destinationIndex: number;
    }>) => {
      const { listId, sourceIndex, destinationIndex } = action.payload;
      const list = state.lists.find(list => list.id === listId);
      
      if (list) {
        const reordered = [...list.cardIds];
        const [removed] = reordered.splice(sourceIndex, 1);
        reordered.splice(destinationIndex, 0, removed);
        
        list.cardIds = reordered;
      }
    },
    
    // For demo purposes, create some initial lists for a board
    initializeMockLists: (state, action: PayloadAction<{ boardId: string }>) => {
      const { boardId } = action.payload;
      
      // Check if board already has lists
      const hasLists = state.lists.some(list => list.id.startsWith(boardId));
      
      if (!hasLists) {
        // Create mock lists for this board based on the UI in the screenshots
        const mockLists: AnyList[] = [
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Filter Desain Pending',
            type: 'filter',
            cardIds: [],
            position: 1
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Filter Deal Maker',
            type: 'filter',
            cardIds: [],
            position: 2
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Filter Desain Terhandle',
            type: 'filter',
            cardIds: [],
            position: 3
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Filter Desain Pending URGENT',
            type: 'filter',
            cardIds: [],
            position: 4
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Request Desain',
            type: 'regular',
            cardIds: [],
            position: 5
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Desain Terambil',
            type: 'regular',
            cardIds: [],
            position: 6
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Revisi Desain',
            type: 'regular',
            cardIds: [],
            position: 7
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Terbit PO',
            type: 'regular',
            cardIds: [],
            position: 8
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Terkirim ke DM',
            type: 'regular',
            cardIds: [],
            position: 9
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Follow Up Desain',
            type: 'regular',
            cardIds: [],
            position: 10
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Desain Acc',
            type: 'regular',
            cardIds: [],
            position: 11
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Stamp',
            type: 'regular',
            cardIds: [],
            position: 12
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Desain closing',
            type: 'regular',
            cardIds: [],
            position: 13
          },
          {
            id: `${boardId}-list-${generateId()}`,
            title: 'Desain Terpending',
            type: 'regular',
            cardIds: [],
            position: 14
          }
        ];
        
        state.lists.push(...mockLists);
      }
    }
  }
});

// Selector to get lists for a specific board
export const selectBoardLists = (state: RootState, boardId: string) => {
  return state.lists.lists
    .filter((list: AnyList) => {
      // Use a more precise pattern matching
      return list.id.startsWith(`${boardId}-list-`) || 
             list.id.startsWith(`${boardId}-filter-`);
    })
    .sort((a: AnyList, b: AnyList) => a.position - b.position);
};

export const { 
  addList, 
  addFilterList, 
  updateList, 
  deleteList, 
  reorderLists, 
  addCardToList, 
  removeCardFromList, 
  moveCard, 
  reorderCards, 
  initializeMockLists 
} = listSlice.actions;

export default listSlice.reducer;