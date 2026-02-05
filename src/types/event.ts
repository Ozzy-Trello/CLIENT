export enum EnumUserActionEvent {
  CardCreated = "card.created",
  CardUpdated = "card.updated",
  CardRenamed = "card.renamed",
  CardMoved = "card.moved",
  CardCopied = "card.copied",
  CardArchived = "card.archived",
  CardUnarchived = "card.unarchived",
  CardDeleted = "card.deleted",
  CardLabelAdded = "card.label.added",
  CardLabelRemove = "card.label.removed",
  CardMemberAdded = "card.member.added",
  CardMemberRemoved = "card.member.removed",
  CardCoverAdded = "card.cover.added",
  CardAttachmentAdded = "card.attachment.added",
  CardAttachmentRemoved = "card.attachment.removed",
  CardCustomFieldChange = "card.customfield.changed",
  CardProductSet = "card.product.set",
  CardCommentAdded = "card.comment.added",
  CardStartDateAdded = "card.startdate.added",
  CardDueDateAdded = "card.duedate.added",
  CardAddedTo = "card.added-to",
  CreatedIn = "card.created-in",
  CardMovedInto = "card.moved-into",
  CardMovedOutOf = "card.moved-out-of",
  ListCreated = "list.created",
  ListMoved = "list.moved",
  ListRenamed = "list.renamed",
  ListArchived = "list.archived",
  ListUnarchived = "list.unarchived",
  ListUpdated = "list.updated",
  ListDeleted = "list.deleted",
  ChecklistAdded = "checklist.added",
  ChecklistCompleted = "checklist.completed",
  ChecklistIncompleted = "checklist.incompleted",
  ChecklistItemChecked = "checklist.item.checked",
  ChecklistItemUnchecked = "checklist.item.unchecked",
  ChecklistItemDueDateSet = "checklist.item.duedate.set",
  ChecklistItemDueDateRemoved = "checklist.item.duedate.removed",
  ChecklistItemAdded = "checklist.item.added",
  ChecklistItemRemoved = "checklist.item.removed",
  ChecklistRemoved = "checklist.removed",
  ButuhBahanChecked = "bahan.checked",
  ButuhBahanUnchecked = "bahan.unchecked",
}

/**
 * Backend websocket event types emitted by automation and system broadcasts.
 */
export enum EnumBackendWebSocketEvent {
  // Card events
  CARD_CREATED = "board.card.created",
  CARD_UPDATED = "board.card.updated",
  CARD_MOVED = "board.card.moved",
  CARD_ARCHIVED = "board.card.archived",
  CARD_UNARCHIVED = "board.card.unarchived",
  CARD_DELETED = "board.card.deleted",
  CARD_COPIED = "board.card.copied",

  // Custom field events
  CARD_CUSTOM_FIELD_UPDATED = "board.card.customField.updated",
  CARD_CUSTOM_FIELD_CLEARED = "board.card.customField.cleared",

  // Checklist events
  CARD_CHECKLIST_ADDED = "board.card.checklist.added",
  CARD_CHECKLIST_REMOVED = "board.card.checklist.removed",
  CARD_CHECKLIST_UPDATED = "board.card.checklist.updated",
  CARD_CHECKLIST_ITEM_CHECKED = "board.card.checklist.item.checked",
  CARD_CHECKLIST_ITEM_UNCHECKED = "board.card.checklist.item.unchecked",
  CARD_CHECKLIST_ITEM_ADDED = "board.card.checklist.item.added",
  CARD_CHECKLIST_ITEM_REMOVED = "board.card.checklist.item.removed",

  // Label events
  CARD_LABEL_ADDED = "board.card.label.added",
  CARD_LABEL_REMOVED = "board.card.label.removed",

  // Member events
  CARD_MEMBER_ADDED = "board.card.member.added",
  CARD_MEMBER_REMOVED = "board.card.member.removed",

  // Attachment events
  CARD_ATTACHMENT_ADDED = "board.card.attachment.added",
  CARD_ATTACHMENT_REMOVED = "board.card.attachment.removed",
  CARD_ATTACHMENT_UPDATED = "board.card.attachment.updated",

  // List events
  LIST_CREATED = "board.list.created",
  LIST_UPDATED = "board.list.updated",
  LIST_ARCHIVED = "board.list.archived",
  LIST_MOVED = "board.list.moved",

  // Board events
  BOARD_UPDATED = "workspace.board.updated",

  // Date events
  CARD_DATE_UPDATED = "board.card.date.updated",
  CARD_COMPLETION_CHANGED = "board.card.completion.changed",

  // Batch events
  BATCH_UPDATE = "board.batch.update",
}

/**
 * WebSocket event data payload structure.
 */
export interface WebSocketEventPayload {
  cardId?: string;
  listId?: string;
  boardId?: string;
  workspaceId?: string;
  changes?: Record<string, any>;
  triggeredBy?: "automation" | "user";
  metadata?: {
    ruleId?: string;
    actionType?: string;
    [key: string]: any;
  };
  timestamp?: string;
  [key: string]: any;
}

/**
 * Batch update event structure used by automation cascade actions.
 */
export interface BatchUpdateEvent {
  type: "batch";
  count: number;
  events: Array<{
    event: string;
    data: WebSocketEventPayload;
  }>;
}

export enum EnumActions {
  MoveCard = "move.card",
  CopyCard = "copy.card",
  MoveCardToBoard = "move.card.to.board",
  ArchiveCard = "archive.card",
  UnarchiveCard = "unarchive.card",
  Notify = "notify",
  ClearCustomField = "clear.custom.field",
  SetCustomField = "set.custom.field",
  CheckCustomField = "check.custom.field",
  UncheckCustomField = "uncheck.custom.field",
  IncreaseNumberCustomField = "increase.number.custom.field",
  DecreaseNumberCustomField = "decrease.number.custom.field",
  SetDateCustomField = "set.date.custom.field",
  MoveDateCustomField = "cardfields.date.move",
  RenameCard = "rename.card",
  SetCardDescription = "set.card.description",
  AddChecklist = "add.checklist",
  AddChecklistItem = "add.checklist.item",
  RemoveChecklistItem = "remove.checklist.item",
  CheckChecklistItem = "check.item",
  UncheckChecklistItem = "uncheck.item",
  SetChecklistItemDueDate = "set.item.due.date",
  MoveChecklistItemDueDate = "move.item.due.date",
  AddCardMember = "add.card.member",
  RemoveCardMember = "remove.card.member",
  FindCard = "cascade.find.card",
  LookupCard = "cascade.lookup.card",
  FindCardByTitle = "cascade.find.card.by.title",
  LinkCards = "link.cards",
  UnlinkCards = "unlink.cards",
  MarkCardCompletion = "mark.card.completion",
  SetCardDateStatus = "set.card.date.status",
  MoveCardDateStatus = "move.card.date.status",
}
