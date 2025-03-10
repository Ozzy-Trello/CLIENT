// src/store/slices/cardSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  Card, 
  CounterCard, 
  User, 
  Attachment, 
  Label, 
  ActivityItem, 
  Checklist, 
  ChecklistItem,
  CustomField,
  CustomFieldValue
} from '@/app/dto/types';
import { generateId, formatDate, calculateTimeInList, getRandomColor } from '@/app/utils/general';
import { RootState } from '.';

interface CardState {
  cards: (Card | CounterCard)[];
  loading: boolean;
  error: string | null;
}

const initialState: CardState = {
  cards: [],
  loading: false,
  error: null
};

const cardSlice = createSlice({
  name: 'card',
  initialState,
  reducers: {
    // Add a new card
    addCard: (state, action: PayloadAction<{ 
      listId: string;
      boardId: string;
      title: string;
      user: User;
    }>) => {
      const { listId, boardId, title, user } = action.payload;
      const now = formatDate();
      
      const newCard: Card = {
        id: `${boardId}-card-${generateId()}`, // Prefix with boardId for easier filtering
        title,
        description: '',
        cover: null,
        attachments: [],
        labels: [],
        members: [user], // Add creator as a member by default
        customFields: [],
        time: {
          inList: '1 second',
          onBoard: '1 second',
          lastActivity: now
        },
        activity: [{
          id: generateId(),
          type: 'create',
          content: `${user.fullname} created this card`,
          user,
          timestamp: now
        }],
        checklists: [],
        isWatched: false,
        isArchived: false,
        position: state.cards.filter(card => card.id.startsWith(boardId)).length + 1,
        createdAt: now,
        updatedAt: now
      };
      
      state.cards.push(newCard);
    },
    
    // Add a counter card
    addCounterCard: (state, action: PayloadAction<{ 
      listId: string;
      boardId: string;
      title: string;
      count: number;
      filterCriteria?: any;
      user: User;
    }>) => {
      const { listId, boardId, title, count, filterCriteria, user } = action.payload;
      const now = formatDate();
      
      const newCard: CounterCard = {
        id: `${boardId}-counter-${generateId()}`,
        title,
        description: '',
        attachments: [],
        labels: [],
        members: [user],
        customFields: [],
        time: {
          inList: '1 second',
          onBoard: '1 second',
          lastActivity: now
        },
        activity: [{
          id: generateId(),
          type: 'create',
          content: `${user.fullname} created this counter card`,
          user,
          timestamp: now
        }],
        checklists: [],
        isWatched: false,
        isArchived: false,
        position: state.cards.filter(card => card.id.startsWith(boardId)).length + 1,
        createdAt: now,
        updatedAt: now,
        isCounter: true,
        count,
        filterCriteria
      };
      
      state.cards.push(newCard);
    },
    
    // Update card basic info
    updateCard: (state, action: PayloadAction<Partial<Card | CounterCard> & { 
      id: string;
      user: User;
    }>) => {
      const { id, user, ...updates } = action.payload;
      const cardIndex = state.cards.findIndex(card => card.id === id);
      
      if (cardIndex !== -1) {
        const card = state.cards[cardIndex];
        const now = formatDate();
        
        // Create an activity record for this update
        const activityItem: ActivityItem = {
          id: generateId(),
          type: 'update',
          content: `${user.fullname} updated this card`,
          user,
          timestamp: now
        };
        
        // Update the card
        state.cards[cardIndex] = { 
          ...card, 
          ...updates,
          activity: [activityItem, ...card.activity],
          time: {
            ...card.time,
            lastActivity: now
          },
          updatedAt: now
        };
      }
    },
    
    // Update card description
    updateCardDescription: (state, action: PayloadAction<{ 
      cardId: string;
      description: string;
      user: User;
    }>) => {
      const { cardId, description, user } = action.payload;
      const cardIndex = state.cards.findIndex(card => card.id === cardId);
      
      if (cardIndex !== -1) {
        const card = state.cards[cardIndex];
        const now = formatDate();
        
        // Create an activity record for this update
        const activityItem: ActivityItem = {
          id: generateId(),
          type: 'update',
          content: `${user.fullname} updated the description`,
          user,
          timestamp: now
        };
        
        // Update the card
        state.cards[cardIndex] = { 
          ...card, 
          description,
          activity: [activityItem, ...card.activity],
          time: {
            ...card.time,
            lastActivity: now
          },
          updatedAt: now
        };
      }
    },
    
    // Delete card
    deleteCard: (state, action: PayloadAction<{ 
      cardId: string;
      user: User;
    }>) => {
      const { cardId } = action.payload;
      state.cards = state.cards.filter(card => card.id !== cardId);
    },
    
    // Archive card
    archiveCard: (state, action: PayloadAction<{ 
      cardId: string;
      user: User;
    }>) => {
      const { cardId, user } = action.payload;
      const cardIndex = state.cards.findIndex(card => card.id === cardId);
      
      if (cardIndex !== -1) {
        const card = state.cards[cardIndex];
        const now = formatDate();
        
        // Create an activity record for this update
        const activityItem: ActivityItem = {
          id: generateId(),
          type: 'archive',
          content: `${user.fullname} archived this card`,
          user,
          timestamp: now
        };
        
        // Update the card
        state.cards[cardIndex] = { 
          ...card, 
          isArchived: true,
          activity: [activityItem, ...card.activity],
          time: {
            ...card.time,
            lastActivity: now
          },
          updatedAt: now
        };
      }
    },
    
    // Update card time in list/board
    updateCardTime: (state, action: PayloadAction<{ 
      cardId: string;
    }>) => {
      const { cardId } = action.payload;
      const cardIndex = state.cards.findIndex(card => card.id === cardId);
      
      if (cardIndex !== -1) {
        const card = state.cards[cardIndex];
        
        // Calculate time in list and on board
        const inList = calculateTimeInList(card.createdAt);
        const onBoard = calculateTimeInList(card.createdAt);
        
        // Update the card's time
        state.cards[cardIndex] = { 
          ...card, 
          time: {
            ...card.time,
            inList,
            onBoard
          }
        };
      }
    },
    
    // Initialize mock cards for demo purposes
    initializeMockCards: (state, action: PayloadAction<{ 
      boardId: string;
      lists: { id: string; title: string }[];
      user: User;
    }>) => {
      // const { boardId, lists, user } = action.payload;
      
      // // Check if board already has cards
      // const hasCards = state.cards.some(card => card.id.startsWith(boardId));
      
      // if (!hasCards && lists.length > 0) {
      //   const now = formatDate();
      //   const mockCards: (Card | CounterCard)[] = [];
        
      //   // Find lists from the screenshots
      //   const dealMakerList = lists.find(list => list.title.includes('Deal Maker'));
      //   const desainTerhandleList = lists.find(list => list.title.includes('Desain Terhandle'));
      //   const terbitPoList = lists.find(list => list.title.includes('Terbit PO'));
      //   const terkirimList = lists.find(list => list.title.includes('Terkirim'));
      //   const followUpList = lists.find(list => list.title.includes('Follow Up'));
        
      //   // Create counter cards for deal maker list
      //   if (dealMakerList) {
      //     const dealMakerCards: CounterCard[] = [
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Handle By Debby',
      //         description: 'Total count of tasks handled by Debby',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 1,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 174
      //       },
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Handle By Devi',
      //         description: 'Total count of tasks handled by Devi',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 2,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 166
      //       },
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Handle By Leoni',
      //         description: 'Total count of tasks handled by Leoni',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 3,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 186
      //       }
      //     ];
          
      //     mockCards.push(...dealMakerCards);
      //   }
        
      //   // Create counter cards for Desain Terhandle list
      //   if (desainTerhandleList) {
      //     const terhandleCards: CounterCard[] = [
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Total Terhandle',
      //         description: 'Total count of all handled designs',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 1,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 818
      //       },
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Handle By Fananda',
      //         description: 'Total count of tasks handled by Fananda',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 2,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 173
      //       },
      //       {
      //         id: `${boardId}-counter-${generateId()}`,
      //         title: 'Handle By Tya',
      //         description: 'Total count of tasks handled by Tya',
      //         cover: null,
      //         attachments: [],
      //         labels: [{
      //           id: generateId(),
      //           title: 'Counter',
      //           color: '#2196F3'
      //         }],
      //         members: [user],
      //         customFields: [],
      //         time: { inList: '1 day', onBoard: '1 day', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this counter card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 3,
      //         createdAt: now,
      //         updatedAt: now,
      //         isCounter: true,
      //         count: 168
      //       }
      //     ];
          
      //     mockCards.push(...terhandleCards);
      //   }
        
      //   // Create sample cards for Terbit PO list
      //   if (terbitPoList) {
      //     const attachment1Id = generateId();
      //     const terbitPoCards: Card[] = [
      //       {
      //         id: `${boardId}-card-${generateId()}`,
      //         title: 'FEAH UNIVERSIDADE',
      //         description: 'Design for yellow polo shirt with blue collar',
      //         cover: {
      //           id: attachment1Id,
      //           filename: 'feah_design.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         },
      //         attachments: [{
      //           id: attachment1Id,
      //           filename: 'feah_design.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         }],
      //         labels: [],
      //         members: [user],
      //         customFields: [
      //           {
      //             id: generateId(),
      //             name: 'Deal Maker',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'Uswatun Hasanah',
      //               displayValue: 'Uswatun Hasanah'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Cabang',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'WBT',
      //               displayValue: 'WBT'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Desain Langsung',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'Tidak',
      //               displayValue: 'Tidak'
      //             }
      //           }
      //         ],
      //         time: { inList: '1 day', onBoard: '1 week', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 1,
      //         createdAt: now,
      //         updatedAt: now
      //       }
      //     ];
          
      //     mockCards.push(...terbitPoCards);
      //   }
        
      //   // Create sample cards for Terkirim list
      //   if (terkirimList) {
      //     const attachment2Id = generateId();
      //     const terkirimCards: Card[] = [
      //       {
      //         id: `${boardId}-card-${generateId()}`,
      //         title: 'KLINIK PORTO',
      //         description: 'Design for navy blue polo shirt',
      //         cover: {
      //           id: attachment2Id,
      //           filename: 'klinik_porto.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         },
      //         attachments: [{
      //           id: attachment2Id,
      //           filename: 'klinik_porto.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         }],
      //         labels: [],
      //         members: [user],
      //         customFields: [
      //           {
      //             id: generateId(),
      //             name: 'Produk',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'HEMCA Polo',
      //               displayValue: 'HEMCA Polo'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Varian',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'Polos',
      //               displayValue: 'Polos'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Jenis Cetak',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'Bordir',
      //               displayValue: 'Bordir'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Cabang',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'WBT',
      //               displayValue: 'WBT'
      //             }
      //           }
      //         ],
      //         time: { inList: '2 days', onBoard: '1 week', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 1,
      //         createdAt: now,
      //         updatedAt: now
      //       }
      //     ];
          
      //     mockCards.push(...terkirimCards);
      //   }
        
      //   // Create sample cards for Follow Up list
      //   if (followUpList) {
      //     const attachment3Id = generateId();
      //     const followUpCards: Card[] = [
      //       {
      //         id: `${boardId}-card-${generateId()}`,
      //         title: 'CAHAYA',
      //         description: 'Design for yellow polo shirt with brand name',
      //         cover: {
      //           id: attachment3Id,
      //           filename: 'cahaya_design.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         },
      //         attachments: [{
      //           id: attachment3Id,
      //           filename: 'cahaya_design.png',
      //           url: 'https://media.canva.com/v2/mockup-template-rasterize/color0:171618/image0:s3%3A%2F%2Ftemplate.canva.com%2FEAFLsJd5odY%2F1%2F0%2F933w-xBtZhbBcHcY.png/mockuptemplateid:FAqieNuus/size:L?csig=AAAAAAAAAAAAAAAAAAAAAJAuNjMCCEDFt3m4qSA-7a1pdrjgZRgZw2Qq7DcFu0Lk&exp=1741576467&osig=AAAAAAAAAAAAAAAAAAAAACr2ZdO05eIrJRsyRZilJ3LlXPaRpNVnfcEeLojmYD2u&seoslug=black-bold-logo-text-graphic-t-shirt&signer=marketplace-rpc',
      //           addedAt: now,
      //           isCover: true
      //         }],
      //         labels: [],
      //         members: [user],
      //         customFields: [
      //           {
      //             id: generateId(),
      //             name: 'Deal Maker',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'Devi Sofiana',
      //               displayValue: 'Devi Sofiana'
      //             }
      //           },
      //           {
      //             id: generateId(),
      //             name: 'Cabang',
      //             type: 'text',
      //             value: {
      //               type: 'text',
      //               value: 'KBT',
      //               displayValue: 'KBT'
      //             }
      //           }
      //         ],
      //         time: { inList: '3 days', onBoard: '2 weeks', lastActivity: now },
      //         activity: [{
      //           id: generateId(),
      //           type: 'create',
      //           content: `${user.fullname} created this card`,
      //           user,
      //           timestamp: now
      //         }],
      //         checklists: [],
      //         isWatched: false,
      //         isArchived: false,
      //         position: 1,
      //         createdAt: now,
      //         updatedAt: now
      //       }
      //     ];
          
      //     mockCards.push(...followUpCards);
      //   }
        
      //   state.cards.push(...mockCards);
      // }
    }
  }
});

// Selectors
export const selectCardsByList = (state: RootState, listId: string) => {
  const list = state.lists.lists.find(l => l.id === listId);
  if (!list) return [];
  
  return list.cardIds
    .map(cardId => state.cards.cards.find(card => card.id === cardId))
    .filter(card => card !== undefined && !card.isArchived)
    .sort((a, b) => a!.position - b!.position) as (Card | CounterCard)[];
};

export const selectArchivedCards = (state: RootState, boardId: string) => {
  return state.cards.cards
    .filter(card => card.id.startsWith(boardId) && card.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const selectCardById = (state: RootState, cardId: string) => {
  return state.cards.cards.find(card => card.id === cardId);
};

export const {
  addCard,
  addCounterCard,
  updateCard,
  updateCardDescription,
  deleteCard,
  archiveCard,
  updateCardTime,
  initializeMockCards
} = cardSlice.actions;

export default cardSlice.reducer;