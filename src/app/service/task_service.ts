// src/services/taskService.ts
import { store } from '@/app/store';
import { 
  addWorkspace, 
  updateWorkspace,
  deleteWorkspace,
  setCurrentWorkspace,
  initializeMockWorkspaces
} from '@/app/store/workspace_slice';

import {
  addBoard,
  updateBoard,
  deleteBoard,
  toggleStarred,
  changeBoardBackground,
  setCurrentBoard,
  initializeMockBoards
} from '@/app/store/board_slice';

import {
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
} from '@/app/store/list_slice';

import {
  addCard,
  addCounterCard,
  updateCard,
  updateCardDescription,
  deleteCard,
  archiveCard,
  updateCardTime,
  initializeMockCards
} from '@/app/store/card_slice';

import {
  initializeMockUsers
} from '@/app/store/user_slice';


import { User, Workspace, Board, AnyList } from '@/app/dto/types';

// Task Management Service
class TaskService {
  // Initialize mock data for demo
  initializeMockData() {
    const { dispatch, getState } = store;
    
    // Initialize users first
    dispatch(initializeMockUsers());
    
    // Get the current user (for auditing)
    const currentUser = getState().users.currentUser;
    
    if (!currentUser) {
      console.error('Cannot initialize mock data: No current user');
      return;
    }
    
    // Initialize workspaces
    dispatch(initializeMockWorkspaces());
    
    // Get current workspace ID
    const currentWorkspaceId = getState().workspaces.currentWorkspace;
    
    if (!currentWorkspaceId) {
      console.error('Cannot initialize mock data: No current workspace');
      return;
    }
    
    // Initialize boards for the current workspace
    dispatch(initializeMockBoards({ 
      workspaceId: currentWorkspaceId, 
      user: currentUser 
    }));
    
    // Get current board ID
    const currentBoardId = getState().boards.currentBoard;
    
    if (!currentBoardId) {
      console.error('Cannot initialize mock data: No current board');
      return;
    }
    
    // Initialize lists for the current board
    dispatch(initializeMockLists({ boardId: currentBoardId }));
    
    // Get the lists for the current board
    const lists = getState().lists.lists
      .filter(list => list.id.startsWith(currentBoardId))
      .map(list => ({ id: list.id, title: list.title }));
    
    // Initialize cards for the current board
    dispatch(initializeMockCards({ 
      boardId: currentBoardId, 
      lists, 
      user: currentUser 
    }));
    
    // Connect cards to lists
    const cards = getState().cards.cards
      .filter(card => card.id.startsWith(currentBoardId));
    
    // For each list, find compatible cards and add them to the list
    lists.forEach(list => {
      let listCards: typeof cards = [];
      
      // Assign cards to lists based on patterns from the screenshots
      if (list.title.includes('Deal Maker')) {
        listCards = cards.filter(card => 
          card.title.includes('Handle By Debby') || 
          card.title.includes('Handle By Devi') || 
          card.title.includes('Handle By Leoni')
        );
      } else if (list.title.includes('Desain Terhandle')) {
        listCards = cards.filter(card => 
          card.title.includes('Total Terhandle') || 
          card.title.includes('Handle By Fananda') || 
          card.title.includes('Handle By Tya')
        );
      } else if (list.title.includes('Terbit PO')) {
        listCards = cards.filter(card => 
          card.title.includes('FEAH')
        );
      } else if (list.title.includes('Terkirim')) {
        listCards = cards.filter(card => 
          card.title.includes('KLINIK PORTO')
        );
      } else if (list.title.includes('Follow Up')) {
        listCards = cards.filter(card => 
          card.title.includes('CAHAYA')
        );
      }
      
      // Add each card to the list
      listCards.forEach(card => {
        dispatch(addCardToList({ 
          listId: list.id, 
          cardId: card.id 
        }));
      });
    });
    
    console.log('Mock data initialization complete');
  }
  
  // Workspace operations
  createWorkspace(name: string, description: string) {
    const { dispatch } = store;
    
    dispatch(addWorkspace({ 
      name, 
      description 
    }));
  }
  
  updateWorkspaceDetails(id: string, updates: Partial<Workspace>) {
    const { dispatch } = store;
    
    dispatch(updateWorkspace({ 
      id, 
      ...updates 
    }));
  }
  
  removeWorkspace(id: string) {
    const { dispatch } = store;
    
    dispatch(deleteWorkspace(id));
  }
  
  selectWorkspace(id: string) {
    const { dispatch } = store;
    
    dispatch(setCurrentWorkspace(id));
  }
  
  // Board operations
  createBoard(workspaceId: string, title: string, cover?: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot create board: No current user');
      return;
    }
    
    dispatch(addBoard({ 
      workspaceId, 
      title, 
      cover, 
      user 
    }));
    
    // After creating a board, we should select it
    const currentBoardId = getState().boards.currentBoard;
    
    if (currentBoardId) {
      // Initialize empty lists for the new board
      dispatch(initializeMockLists({ boardId: currentBoardId }));
    }
  }
  
  updateBoardDetails(id: string, updates: Partial<Board>) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot update board: No current user');
      return;
    }
    
    dispatch(updateBoard({ 
      id, 
      ...updates, 
      user 
    }));
  }
  
  removeBoard(id: string) {
    const { dispatch } = store;
    
    dispatch(deleteBoard(id));
  }
  
  starBoard(boardId: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot star board: No current user');
      return;
    }
    
    dispatch(toggleStarred({ 
      boardId, 
      user 
    }));
  }
  
  changeBoardBackground(boardId: string, background: any) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot change board background: No current user');
      return;
    }
    
    dispatch(changeBoardBackground({ 
      boardId, 
      background, 
      user 
    }));
  }
  
  selectBoard(id: string) {
    const { dispatch } = store;
    
    dispatch(setCurrentBoard(id));
  }
  
  // List operations
  createList(boardId: string, title: string, cover?: string) {
    const { dispatch } = store;
    
    dispatch(addList({ 
      boardId, 
      title, 
      cover 
    }));
  }
  
  createFilterList(boardId: string, title: string, filterCriteria?: any) {
    const { dispatch } = store;
    
    dispatch(addFilterList({ 
      boardId, 
      title, 
      filterCriteria 
    }));
  }
  
  updateListDetails(id: string, updates: Partial<AnyList>) {
    const { dispatch } = store;
    
    dispatch(updateList({ 
      id, 
      ...updates 
    }));
  }
  
  removeList(id: string) {
    const { dispatch } = store;
    
    dispatch(deleteList(id));
  }
  
  reorderListsInBoard(boardId: string, sourceIndex: number, destinationIndex: number) {
    const { dispatch } = store;
    
    dispatch(reorderLists({ 
      boardId, 
      sourceIndex, 
      destinationIndex 
    }));
  }
  
  // Card operations
  createCard(listId: string, boardId: string, title: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot create card: No current user');
      return;
    }
    
    // Create the card
    dispatch(addCard({ 
      listId, 
      boardId, 
      title, 
      user 
    }));
    
    // Get the newly created card
    const cards = getState().cards.cards;
    const newCard = cards[cards.length - 1]; // The last card is the one we just created
    
    // Add the card to the list
    dispatch(addCardToList({ 
      listId, 
      cardId: newCard.id 
    }));
  }
  
  createCounterCard(listId: string, boardId: string, title: string, count: number, filterCriteria?: any) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot create counter card: No current user');
      return;
    }
    
    // Create the counter card
    dispatch(addCounterCard({ 
      listId, 
      boardId, 
      title, 
      count, 
      filterCriteria, 
      user 
    }));
    
    // Get the newly created card
    const cards = getState().cards.cards;
    const newCard = cards[cards.length - 1]; // The last card is the one we just created
    
    // Add the card to the list
    dispatch(addCardToList({ 
      listId, 
      cardId: newCard.id 
    }));
  }
  
  updateCardDetails(id: string, updates: Partial<any>) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot update card: No current user');
      return;
    }
    
    dispatch(updateCard({ 
      id, 
      ...updates, 
      user 
    }));
  }
  
  updateCardDescription(cardId: string, description: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot update card description: No current user');
      return;
    }
    
    dispatch(updateCardDescription({ 
      cardId, 
      description, 
      user 
    }));
  }
  
  removeCard(cardId: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot remove card: No current user');
      return;
    }
    
    // Find the list that contains this card
    const lists = getState().lists.lists;
    const listWithCard = lists.find(list => list.cardIds.includes(cardId));
    
    if (listWithCard) {
      // Remove card from list
      dispatch(removeCardFromList({ 
        listId: listWithCard.id, 
        cardId 
      }));
    }
    
    // Delete the card
    dispatch(deleteCard({ 
      cardId, 
      user 
    }));
  }
  
  archiveCard(cardId: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    
    if (!user) {
      console.error('Cannot archive card: No current user');
      return;
    }
    
    dispatch(archiveCard({ 
      cardId, 
      user 
    }));
  }
  
  moveCardBetweenLists(cardId: string, sourceListId: string, destinationListId: string) {
    const { dispatch } = store;
    
    dispatch(moveCard({ 
      cardId, 
      sourceListId, 
      destinationListId 
    }));
    
    // Update time in list
    dispatch(updateCardTime({ 
      cardId 
    }));
  }
  
  reorderCardsInList(listId: string, sourceIndex: number, destinationIndex: number) {
    const { dispatch } = store;
    
    dispatch(reorderCards({ 
      listId, 
      sourceIndex, 
      destinationIndex 
    }));
  }
  
  // Advanced operations that coordinate between different slices
  // createBoardWithDefaultLists(workspaceId: string, title: string) {
  //   const { dispatch, getState } = store;
  //   const user = getState().users.currentUser;
    
  //   if (!user) {
  //     console.error('Cannot create board with lists: No current user');
  //     return;
  //   }
    
  //   // Create the board
  //   dispatch(addBoard({ 
  //     workspaceId, 
  //     title, 
  //     user 
  //   }));
    
  //   // Get the newly created board
  //   const currentBoardId = getState().boards.currentBoard;
    
  //   if (!currentBoardId) {
  //     console.error('Board creation failed');
  //     return;
  //   }
    
  //   // Create default lists
  //   const defaultLists = [
  //     'To Do',
  //     'In Progress',
  //     'Done'
  //   ];
    
  //   defaultLists.forEach((listTitle, index) => {
  //     dispatch(addList({ 
  //       boardId: currentBoardId, 
  //       title: listTitle 
  //     }));
  //   });
  // }
  
  duplicateBoard(boardId: string, newTitle: string) {
    const { dispatch, getState } = store;
    const user = getState().users.currentUser;
    const boards = getState().boards.boards;
    const lists = getState().lists.lists;
    const cards = getState().cards.cards;
    
    // Find the board to duplicate
    const boardToDuplicate = boards.find(board => board.id === boardId);
    
    if (!boardToDuplicate || !user) {
      console.error('Cannot duplicate board: Board not found or no current user');
      return;
    }
    
    // Create new board with same workspace
    dispatch(addBoard({ 
      workspaceId: boardToDuplicate.workspaceId, 
      title: newTitle || `${boardToDuplicate.title} (Copy)`, 
      user 
    }));
    
    // Get ID of the new board
    const newBoardId = getState().boards.currentBoard;
    
    if (!newBoardId) {
      console.error('Board duplication failed');
      return;
    }
    
    // Find all lists from the original board
    const boardLists = lists.filter(list => list.id.startsWith(boardId))
      .sort((a, b) => a.position - b.position);
    
    // Create new lists with same titles
    const listIdMap = new Map(); // To map old list IDs to new ones
    
    boardLists.forEach(oldList => {
      // Add new list
      dispatch(addList({ 
        boardId: newBoardId, 
        title: oldList.title, 
        // cover: oldList.cover 
      }));
      
      // Get the new list ID
      const newLists = getState().lists.lists;
      const newList = newLists[newLists.length - 1]; // The last list is the one we just created
      
      // Store mapping of old list ID to new list ID
      listIdMap.set(oldList.id, newList.id);
    });
    
    // For each original list, duplicate its cards to the new list
    boardLists.forEach(oldList => {
      const newListId = listIdMap.get(oldList.id);
      
      // Skip if we couldn't find the new list
      if (!newListId) return;
      
      // Get cards from the old list
      oldList.cardIds.forEach(cardId => {
        const card = cards.find(c => c.id === cardId);
        
        // Skip if card not found or is a counter card
        if (!card || 'isCounter' in card) return;
        
        // Create a new card with similar properties
        dispatch(addCard({ 
          listId: newListId, 
          boardId: newBoardId, 
          title: card.title, 
          user 
        }));
        
        // Get the newly created card
        const newCards = getState().cards.cards;
        const newCard = newCards[newCards.length - 1];
        
        // Update the new card with details from the original
        dispatch(updateCard({ 
          id: newCard.id, 
          description: card.description, 
          user 
        }));
        
        // Add the card to the list
        dispatch(addCardToList({ 
          listId: newListId, 
          cardId: newCard.id 
        }));
      });
    });
    
    // Select the new board
    dispatch(setCurrentBoard(newBoardId));
  }
}

// Create a singleton instance
const taskService = new TaskService();

export default taskService;