// Type definitions for the automation rule system

// ENUMS
export enum TriggerTypeId {
  CARD_MOVE = 'card-move',
  CARD_CHANGES = 'card-changes',
  DATES = 'dates',
  CHECKLISTS = 'checklists',
  CARD_CONTENT = 'card-content',
  FIELDS = 'fields'
}

export enum ActionTypeId {
  MOVE = 'move',
  ADD_REMOVE = 'add-remove',
  DATES = 'dates',
  CHECKLISTS = 'checklists',
  MEMBERS = 'members',
  CONTENT = 'content',
  FIELDS = 'fields',
  SORT = 'sort',
  CASCADE = 'cascade'
}

export enum EntityTypeId {
  CARD = 'card',
  LIST = 'list',
  BOARD = 'board',
  MEMBER = 'member',
  LABEL = 'label',
  ATTACHMENT = 'attachment',
  VOTE = 'vote',
  DATE = 'date',
  CHECKLIST = 'checklist'
}

export enum OperatorTypeId {
  IS = 'is',
  IN = 'in',
  WITH = 'with',
  ASSIGNED_TO = 'assigned-to',
  ADDED_TO = 'added-to',
  MOVED = 'moved',
  CREATED = 'created',
  MARKED_AS = 'marked-as',
  CONTAINING = 'containing',
  ARCHIVED = 'archived',
  HAS = 'has',
  ENTER = 'enter',
  SET_ON = 'set-on'
}

export enum ComponentTypeId {
  TEXT = 'text',
  SELECT = 'select',
  INPUT = 'input',
  USER_SELECT = 'user-select',
  BOARD_SELECT = 'board-select',
  LIST_SELECT = 'list-select',
  LABEL_SELECT = 'label-select',
  NUMBER_INPUT = 'number-input'
}

// INTERFACES

// Trigger & Action type definitions
export interface TriggerType {
  id: TriggerTypeId;
  name: string;
  icon: string;
  description?: string;
}

export interface ActionType {
  id: ActionTypeId;
  name: string;
  icon: string;
  description?: string;
  isIntegration?: boolean;
}

// Component type for UI rendering
export interface ComponentDefinition {
  id: string;
  type: ComponentTypeId;
  text?: string;
  placeholder?: string;
  valueKey?: string; // Key to store the selected value in values object
  options?: Array<{ id: string; name: string; color?: string }>;
  defaultValue?: any;
}

// Trigger template definitions
export interface TriggerTemplate {
  id: string;
  triggerTypeId: TriggerTypeId;
  name: string;
  description: string;
  components: ComponentDefinition[];
  explanationText?: string;
  noteText?: string;
}

// Action template definitions
export interface ActionTemplate {
  id: string;
  actionTypeId: ActionTypeId;
  name: string;
  description: string;
  components: ComponentDefinition[];
  explanationText?: string;
}

// Instance types for selected trigger/action
export interface TriggerInstance {
  id: string;
  templateId: string;
  values: Record<string, any>;
}

export interface ActionInstance {
  id: string;
  templateId: string;
  values: Record<string, any>;
}

// Complete rule definition
export interface Rule {
  id: string;
  name?: string;
  triggers: TriggerInstance[];
  actions: ActionInstance[];
  isActive: boolean;
}

// MASTER DATA - Contains all the available definitions and templates

// Master list of trigger types
export const triggerTypes: TriggerType[] = [
  { id: TriggerTypeId.CARD_MOVE, name: 'Card Move', icon: '→' },
  { id: TriggerTypeId.CARD_CHANGES, name: 'Card Changes', icon: '+-' },
  { id: TriggerTypeId.DATES, name: 'Dates', icon: '🕒' },
  { id: TriggerTypeId.CHECKLISTS, name: 'Checklists', icon: '✓' },
  { id: TriggerTypeId.CARD_CONTENT, name: 'Card Content', icon: '💬' },
  { id: TriggerTypeId.FIELDS, name: 'Fields', icon: '≡' }
];

// Master list of action types
export const actionTypes: ActionType[] = [
  { id: ActionTypeId.MOVE, name: 'Move', icon: '→' },
  { id: ActionTypeId.ADD_REMOVE, name: 'Add/Remove', icon: '+-' },
  { id: ActionTypeId.DATES, name: 'Dates', icon: '🕒' },
  { id: ActionTypeId.CHECKLISTS, name: 'Checklists', icon: '✓' },
  { id: ActionTypeId.MEMBERS, name: 'Members', icon: '👤' },
  { id: ActionTypeId.CONTENT, name: 'Content', icon: '💬' },
  { id: ActionTypeId.FIELDS, name: 'Fields', icon: '≡' },
  { id: ActionTypeId.SORT, name: 'Sort', icon: '⇅' },
  { id: ActionTypeId.CASCADE, name: 'Cascade', icon: '◻' }
];

// Integration action types
export const integrationActionTypes: ActionType[] = [
  { id: 'jira' as ActionTypeId, name: 'Jira', icon: 'J', isIntegration: true },
  { id: 'bitbucket' as ActionTypeId, name: 'Bitbucket', icon: 'B', isIntegration: true },
  { id: 'slack' as ActionTypeId, name: 'Slack', icon: 'S', isIntegration: true }
];

// --------  Trigger templates based on the screenshots ---------
export const triggerTemplates: TriggerTemplate[] = [
  // Card Move triggers
  {
    id: 'card-moved-out-of-board',
    triggerTypeId: TriggerTypeId.CARD_MOVE,
    name: 'Card moved out of board',
    description: 'when a card is moved out of the board',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'moved out of' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'the board' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ],
    explanationText: '"Added" means created, copied, moved into the board or emailed into the board.'
  },
  {
    id: 'card-added-to-list',
    triggerTypeId: TriggerTypeId.CARD_MOVE,
    name: 'Card added to list',
    description: 'when a card is added to list',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'list', type: ComponentTypeId.TEXT, text: 'list' },
      { id: 'listSelect', type: ComponentTypeId.LIST_SELECT, placeholder: 'select list', valueKey: 'listId' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ],
    explanationText: '"Added" means created, copied, emailed or moved into the list.'
  },
  {
    id: 'card-archived',
    triggerTypeId: TriggerTypeId.CARD_MOVE,
    name: 'Card archived',
    description: 'when a card is archived',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'archived' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'list-created',
    triggerTypeId: TriggerTypeId.CARD_MOVE,
    name: 'List created',
    description: 'when a list is created',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a list is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'created' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'list-has-cards',
    triggerTypeId: TriggerTypeId.CARD_MOVE,
    name: 'List has exact number of cards',
    description: 'when list has exactly cards',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when list' },
      { id: 'list', type: ComponentTypeId.LIST_SELECT, placeholder: 'select list', valueKey: 'listId' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'has' },
      { id: 'compareType', type: ComponentTypeId.TEXT, text: 'exactly' },
      { id: 'number', type: ComponentTypeId.NUMBER_INPUT, placeholder: '1', valueKey: 'cardCount', defaultValue: 1 },
      { id: 'suffix', type: ComponentTypeId.TEXT, text: 'cards' }
    ]
  },
  
  // Dates triggers
  {
    id: 'due-date-set',
    triggerTypeId: TriggerTypeId.DATES,
    name: 'Due date set on card',
    description: 'when a due date is set on a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a' },
      { id: 'type', type: ComponentTypeId.TEXT, text: 'due' },
      { id: 'entity', type: ComponentTypeId.TEXT, text: 'date' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'set on' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ],
    explanationText: "'moved' only triggers when the card already had a due date, while 'set' triggers regardless."
  },
  {
    id: 'date-in-card-name',
    triggerTypeId: TriggerTypeId.DATES,
    name: 'Date in card name',
    description: 'when I enter a card name containing a date',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when' },
      { id: 'subject', type: ComponentTypeId.TEXT, text: 'I enter' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card name' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'containing' },
      { id: 'entity', type: ComponentTypeId.TEXT, text: 'a date' },
      { id: 'searchIcon', type: ComponentTypeId.TEXT, text: '🔍' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'set' },
      { id: 'dateType', type: ComponentTypeId.TEXT, text: 'due' },
      { id: 'suffix', type: ComponentTypeId.TEXT, text: 'on the date' },
      { id: 'externalLink', type: ComponentTypeId.TEXT, text: '🔗' }
    ],
    explanationText: "This automation will automatically add due dates to your cards when you enter a temporal indication in the name or description, e.g. tomorrow at 10, next tuesday, april 15, 8/6/19, in two working days, before the last Friday of the month, etc.",
    noteText: "This will only trigger when you create a card, or modify its name or description. It will not work retro-actively for existing cards on the board."
  },
  
  // Card Changes triggers
  {
    id: 'card-marked-complete',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'Card marked as complete',
    description: 'when the card is marked as complete',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when the card is marked as' },
      { id: 'status', type: ComponentTypeId.TEXT, text: 'complete' },
      { id: 'suffix', type: ComponentTypeId.TEXT, text: 'in a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'label-added-to-card',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'Label added to card',
    description: 'when a label is added to a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when' },
      { id: 'subject', type: ComponentTypeId.TEXT, text: 'the' },
      { id: 'label', type: ComponentTypeId.LABEL_SELECT, text: 'light green "PO Masuk"', valueKey: 'labelId' },
      { id: 'suffix', type: ComponentTypeId.TEXT, text: 'label is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'attachment-added-to-card',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'Attachment added to card',
    description: 'when an attachment is added to a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when an attachment' },
      { id: 'attachmentIcon', type: ComponentTypeId.TEXT, text: '📎' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'member-added-to-card',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'I am added to a card',
    description: 'when I am added to a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when' },
      { id: 'subject', type: ComponentTypeId.TEXT, text: 'I am' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  },
  {
    id: 'specific-member-added-to-card',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'Specific member added to card',
    description: 'when a specific member is added to a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when' },
      { id: 'memberIcon', type: ComponentTypeId.TEXT, text: '@' },
      { id: 'member', type: ComponentTypeId.INPUT, placeholder: 'username', valueKey: 'username' },
      { id: 'operator', type: ComponentTypeId.TEXT, text: 'is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'actingMember', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'actingMemberId' }
    ]
  },
  {
    id: 'vote-added-to-card',
    triggerTypeId: TriggerTypeId.CARD_CHANGES,
    name: 'Vote added to card',
    description: 'when a vote is added to a card',
    components: [
      { id: 'intro', type: ComponentTypeId.TEXT, text: 'when a vote is' },
      { id: 'action', type: ComponentTypeId.TEXT, text: 'added to' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'a card' },
      { id: 'filter', type: ComponentTypeId.SELECT, text: '', placeholder: 'Any card', valueKey: 'cardFilter' },
      { id: 'member', type: ComponentTypeId.USER_SELECT, placeholder: 'any member', valueKey: 'memberId' }
    ]
  }
];

// -------- Action templates based on the screenshots ---------
export const actionTemplates: ActionTemplate[] = [
  // Move actions
  {
    id: 'move-card-to-list',
    actionTypeId: ActionTypeId.MOVE,
    name: 'Move card to list',
    description: 'move the card to the top of list',
    components: [
      { id: 'action', type: ComponentTypeId.TEXT, text: 'move' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'the card to' },
      { id: 'position', type: ComponentTypeId.TEXT, text: 'the top of list' },
      { id: 'list', type: ComponentTypeId.LIST_SELECT, placeholder: 'select list', valueKey: 'listId' }
    ]
  },
  {
    id: 'move-card-to-list-with-board',
    actionTypeId: ActionTypeId.MOVE,
    name: 'Move card to list on board',
    description: 'move the card to the top of list on board',
    components: [
      { id: 'action', type: ComponentTypeId.TEXT, text: 'move' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'the card to' },
      { id: 'position', type: ComponentTypeId.TEXT, text: 'the top of list' },
      { id: 'list', type: ComponentTypeId.LIST_SELECT, placeholder: 'select list', valueKey: 'listId' },
      { id: 'separator', type: ComponentTypeId.TEXT, text: 'on board' },
      { id: 'board', type: ComponentTypeId.BOARD_SELECT, placeholder: 'select board', valueKey: 'boardId' }
    ]
  },
  {
    id: 'archive-card',
    actionTypeId: ActionTypeId.MOVE,
    name: 'Archive card',
    description: 'archive the card',
    components: [
      { id: 'action', type: ComponentTypeId.TEXT, text: 'archive' },
      { id: 'target', type: ComponentTypeId.TEXT, text: 'the card' }
    ]
  }
];

// Available labels for dropdown selection
export const availableLabels = [
  { id: 'label-1', name: 'PO Masuk', color: 'light-green' },
  { id: 'label-2', name: 'Urgent', color: 'red' },
  { id: 'label-3', name: 'In Progress', color: 'blue' },
  { id: 'label-4', name: 'Done', color: 'green' }
];

// Available boards for dropdown selection
export const availableBoards = [
  { id: 'board-1', name: 'Project Alpha' },
  { id: 'board-2', name: 'Marketing Tasks' },
  { id: 'board-3', name: '4.7 Request Desain | Outlet' },
  { id: 'board-4', name: 'Filter Desain Terhandle' }
];

// Available lists for dropdown selection
export const availableLists = [
  { id: 'list-1', name: 'To Do', boardId: 'board-1' },
  { id: 'list-2', name: 'In Progress', boardId: 'board-1' },
  { id: 'list-3', name: 'Done', boardId: 'board-1' },
  { id: 'list-4', name: 'Filter Desain Terhandle', boardId: 'board-3' },
  { id: 'list-5', name: '4.7 Request Desain | Outlet', boardId: 'board-4' }
];

// Available users/members for dropdown selection
export const availableUsers = [
  { id: 'user-1', name: 'John Doe', username: 'john' },
  { id: 'user-2', name: 'Jane Smith', username: 'jane' },
  { id: 'user-3', name: 'Alex Johnson', username: 'alex' }
];

// Helper functions
export function getTriggerTemplatesForType(typeId: TriggerTypeId): TriggerTemplate[] {
  return triggerTemplates.filter(template => template.triggerTypeId === typeId);
}

export function getActionTemplatesForType(typeId: ActionTypeId): ActionTemplate[] {
  return actionTemplates.filter(template => template.actionTypeId === typeId);
}

export function getTriggerTemplate(templateId: string): TriggerTemplate | undefined {
  return triggerTemplates.find(template => template.id === templateId);
}

export function getActionTemplate(templateId: string): ActionTemplate | undefined {
  return actionTemplates.find(template => template.id === templateId);
}

export function formatTriggerDescription(triggerInstance: TriggerInstance): string {
  const template = getTriggerTemplate(triggerInstance.templateId);
  if (!template) return '';
  
  // For this simple implementation, just return the template description
  return template.description;
}

export function formatActionDescription(actionInstance: ActionInstance): string {
  const template = getActionTemplate(actionInstance.templateId);
  if (!template) return '';
  
  // For this simple implementation, just return the template description
  return template.description;
}