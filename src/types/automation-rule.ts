import { AutomationRuleTrigger } from "./type";

export const enum TriggerGroupType {
  CardMove = "card.move",
  CardChanges = "card.changes",
  CardDates = "card.dates",
  CardChecklist = "card.checklists",
  CardContent = "card.content",
  CardFields = "card.fields",
  CardButton = "card.button",
}

export const enum ActionGroupType {
  CardMove = "card.move",
  AddOrRemove = "add-or-remove",
  CardDates = "card.dates",
  CardChecklists = "card.checklists",
  CardMembers = "card.members",
  CardContent = "card.content",
  CardFields = "card.fields",
  ListSort = "list.sort",
  Cascade = "cascade",
}

export enum EnumTextType {
  SelectedUser = "selected_user",
}

export enum EnumSelectionType {
  OptionalFilter = "filter",
  Action = "action",
  Completion = "completion",
  OptionalAction = "optional_action",
  Position = "position",
  OptionalPosition = "optional_position",
  NumberComparison = "number_comparison",
  TextComparison = "text_comparison",
  BySubject = "by",
  OptionalBySubject = "optional_by",
  Board = "board",
  OptionalBoard = "opational_board",
  List = "list",
  OptionalList = "optional_list",
  MultiLists = "multi_lists",
  Channel = "channel",
  TextInput = "text_input",
  User = "user",
  Role = "role",
  Fields = "fields",
  FieldValue = "field_value",
  FieldValueOperator = "field_value_operator",
  MultiFields = "multi_fields",
  Set = "set",
  ArticleType = "article_type", //[the, any]
  Subject = "subject", //[i am, someone is]
  Inclusion = "inclusion",
  CardLabel = "card_label",
  Assignment = "assignment",
  AssignmentSubject = "assignment_subject",
  DateExpression = "date_expression",
  CheckboxState = "checkbox_state", // checkbox checked/unchecked state
  ChecklistScope = "checklist_scope", // checklist / a checklist / all checklists
  ItemScope = "item_scope",
  DateValue = "date_value",
  ChecklistName = "checklist_name",
  CreateType = "create_type", // new | unique
  CreateTypeItem = "create_type_item", // regular | board | link | separator | mirror
  MultiLabels = "multi_labels",
  MultiChecklists = "multi_checklists",
  MultiUsers = "multi_users",
  MultiDates = "multi_dates",
  AddRemove = "add_remove",
  RemoveFromCard = "remove_from_card",
  TaskType = "task_type",
  SetTask = "set_task",
  CardContentType = "card_content_type",
  CardContentText = "card_content_text",
  DateStatus = "date_status",
  TimeRange = "time_range",
  TimeComparison = "time_comparison",
  TimeUnit = "time_unit",
  TimeRelativeReference = "time_relative_reference",
  ChecklistConditionOperator = "checklists_condition_oerator", // with all complete, with an incomplete, etc
  CustomField = "custom_field",
  CustomFieldAction = "custom_field_action", // set, cleared
  CascadeAction = "cascade_action", // find or lookup
  CardOrder = "card_order", // first or last
  SelectableList = "selectable_list", // for optional list selection like checklist filter
  SelectableBoard = "selectable_board", // for optional board selection like checklist filter
  Product = "product",
  Expression = "expression", // mathematical expression builder
  Operation = "operation", // mathematical operations
  Target = "target",
  ThreadId = "thread_id",
  IncludeProduk = "include_produk",
  IncludeBahan = "include_bahan",
  IncludeWarna = "include_warna",
  TelegramChannel = "telegram_channel", // Telegram channel selection
}

export enum EnumInputType {
  Number = "number",
  Text = "text",
  FieldValue = "field_value",
  MultiFieldValue = "multi_field_value",
  DateValue = "date_value",
  TextDescription = "text_description",
  TextTitle = "text_title",
}

export enum TriggerType {
  // CARD MOVE
  //  `when-a-card-<filter>-is-<action>-the-board-<optional_by>`,
  WhenACardActionOverBoard = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>-the-board-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-a-card-<filter>-is-<action*>-list-<list*>-<by>",
  WhenACardActionOverList = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>-list-<${EnumSelectionType.List}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-a-card-<filter>-is-<action*>-lists-<multi_lists*>-<by>",
  WhenACardActionOverMultipleLists = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>-lists-<${EnumSelectionType.MultiLists}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-a-<filter>-is-<action*>" archival action
  WhenACardHasArchivalAction = `when-a-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>`,

  // "when-list-<list*>-has-<number-comparison*>-[number]"
  WhenListHasCards = `when-list-<${EnumSelectionType.List}>-has-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]`,

  // CARD CHANGES
  WhenCardCompletionChanges = `when-the-card-is-marked-<${EnumSelectionType.Completion}>-in-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  // now includes specific label placeholder so users can pick a label
  WhenCardLabelChanges = `when-<${EnumSelectionType.ArticleType}>-<${EnumSelectionType.CardLabel}>-label-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenCardAttachmentChanges = `when-an-attachment-<${EnumSelectionType.TextComparison}>-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenCardMemberChanges = `when-<${EnumSelectionType.Subject}>-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenProductIsSet = `when-a-product-is-set-to-<${EnumSelectionType.Product}>`,

  // CUSTOM FIELDS
  // "when-custom-fields-<fields>-is-set-to-<field_value>-<filter>-<optional_by>"
  WhenCustomFieldsIsSetToFieldValue = `when-custom-fields-<${EnumSelectionType.Fields}>-is-set-to-<${EnumInputType.FieldValue}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-fields-<fields>-<field_value_operator>-<multi_field_value>-<filter>-<optional_by>"
  WhenCustomFieldsIncludesAnyValue = `when-custom-fields-<${EnumSelectionType.Fields}>-<${EnumSelectionType.FieldValueOperator}>-<${EnumInputType.MultiFieldValue}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-fields-<fields>-is-<action>-<filter>-<optional_by>"
  WhenCustomFieldsIsSet = `when-custom-fields-<${EnumSelectionType.Fields}>-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-<state>-<filter>-<optional_by>"
  WhenCustomFieldIsChecked = `when-custom-field-<${EnumSelectionType.Fields}>-is-<${EnumSelectionType.CheckboxState}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-set-to-a-number-<number_comparison>-[number]-<filter>-<optional_by>"
  WhenCustomFieldNumberComparison = `when-custom-field-<${EnumSelectionType.Fields}>-is-set-to-a-number-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-set-to-a-date-<date_expression>-<filter>-<optional_by>"
  WhenCustomFieldDateCondition = `when-custom-field-<${EnumSelectionType.Fields}>-is-set-to-a-date-<${EnumSelectionType.DateExpression}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // NEW TRIGGERS
  // "when all the custom fields are completed <filter> <optional_by>"
  WhenAllCustomFieldsAreCompleted = `when-all-the-custom-fields-are-completed-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when custom fields <fields> are completed <filter> <optional_by>"
  WhenCustomFieldsAreCompleted = `when-custom-fields-<${EnumSelectionType.Fields}>-are-completed-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when checklist [text] is <action> to a card <filter> <optional_by>"
  WhenChecklistIsAction = `when-checklist-[${EnumInputType.Text}]-is-<${EnumSelectionType.Action}>-to-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when checklist completion changes"
  WhenChecklistCompletionChanges = `when-<${EnumSelectionType.ChecklistScope}>[${EnumInputType.Text}]-is-<${EnumSelectionType.Action}>-in-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when (the/an) [item_name] item is <action> <filter> <optional_by>"
  WhenChecklistItemStateChanges = `when-<${EnumSelectionType.ItemScope}>[${EnumInputType.Text}]-item-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when a due date <date_expression> is <action> a checklist item"
  WhenChecklistItemDueDateChanges = `when-a-due-date-<${EnumSelectionType.DateExpression}>-is-<${EnumSelectionType.Action}>-a-checklist-item`,

  // "when an item <text_comparison> is <action> <checklist_scope> [text] <filter> <optional_by>"
  WhenChecklistItemIsAddedTo = `when-an-item-<${EnumSelectionType.TextComparison}>-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.ChecklistScope}>[${EnumInputType.Text}]-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // when a <TaskType> date <DateExpression> is <SetTask> a card <OptionalFilter> <OptionalBySubject>
  WhenTaskDateIsSet = `when-a-<${EnumSelectionType.TaskType}>-date-<${EnumSelectionType.DateExpression}>-is-<${EnumSelectionType.SetTask}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // when <CardContentType> of a card <OptionalFilter> <CardContentText> <Text>
  WhenCardContentTextIsSet = `when-<${EnumSelectionType.CardContentType}>-of-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.CardContentText}>-[${EnumInputType.Text}]`,

  // when butuh bahan is <Action> <OptionalFilter> <OptionalBySubject>
  WhenButuhBahanIsChecked = `when-butuh-bahan-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // add more..
}

export enum ActionType {
  ActionTheCardToPositionInSpecificList = `<${EnumSelectionType.Action}>-the-card-to-<${EnumSelectionType.Position}>-<${EnumSelectionType.List}>`,
  ActionTheCardToPosition = `<action>-the-card-to-<${EnumSelectionType.Position}>`,
  ActionTheCardToBoardList = `<${EnumSelectionType.Action}>-the-card-to-<${EnumSelectionType.Position}>-<${EnumSelectionType.Board}>-<${EnumSelectionType.List}>`,
  ArchivalActionTheCard = `<${EnumSelectionType.Action}>-the-card`,
  NotifyTheCard = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-<${EnumSelectionType.User}>-with-message-<${EnumSelectionType.TextInput}>`,
  NotifySelectedUser = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-${EnumTextType.SelectedUser}-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  NotifyUserFromCustomFields = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-users-from-<${EnumSelectionType.Fields}>-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  ClearCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>`,
  SetCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>-to-<${EnumInputType.FieldValue}>`,
  CheckCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>`,
  IncrementCustomField = `<${EnumSelectionType.Action}>-the-number-in-custom-field-<${EnumSelectionType.Fields}>-by-[${EnumInputType.Number}]`,
  SetDateCustomField = `set-date-custom-field-<${EnumSelectionType.Fields}>-to-<date_value>`,
  MoveDateCustomField = `move-date-in-custom-field-<${EnumSelectionType.Fields}>-to-<date_value>`,
  RenameCard = `rename-the-card-to-<${EnumSelectionType.TextInput}>`,
  SetCardDescription = `set-the-card's-description-to-<${EnumSelectionType.TextInput}>`,
  AddChecklistToCard = `<${EnumSelectionType.Action}>-an-empty-checklist-named-<${EnumSelectionType.TextInput}>-to-the-card`,
  ManageChecklistItem = `<${EnumSelectionType.Action}>-item-<${EnumSelectionType.TextInput}>-to-checklist-<${EnumSelectionType.ChecklistName}>`,
  SetChecklistItemDueDate = `set-the-item-due-<${EnumInputType.DateValue}>`,
  MoveChecklistItemDueDate = `move-the-item-due-date-to-<${EnumInputType.DateValue}>`,
  ToggleChecklistItem = `<${EnumSelectionType.Action}>-item-<${EnumSelectionType.TextInput}>-in-checklist-<${EnumSelectionType.ChecklistName}>`,
  AddCardMember = `add-member-<${EnumSelectionType.User}>-to-the-card`,
  RemoveCardMember = `remove-member-<${EnumSelectionType.User}>-from-the-card`,
  RemoveAllCardMembers = `remove-all-the-members-from-the-card`,

  // Action Dates
  MarkCardCompletion = `<${EnumSelectionType.Action}>-the-card-as-<${EnumSelectionType.Completion}>`,
  SetCardDateStartOrDue = `<${EnumSelectionType.Action}>-the-card's-<${EnumSelectionType.DateStatus}>-to-<${EnumSelectionType.DateValue}>`,
  MoveCardDateStartOrDue = `<${EnumSelectionType.Action}>-the-<${EnumSelectionType.DateStatus}>-to-<${EnumSelectionType.DateValue}>`,

  // create a <CardType> <CardTypeItem> card with title <TextTitle> <TextDescription> <Position> <Board> <List> <MultiLabels> <MultiChecklists> <MultiUsers> <MultiDates>
  CreateItem = `create-a-<${EnumSelectionType.CreateType}>-card-with-title-<${EnumInputType.TextTitle}>-<${EnumInputType.TextDescription}>-<${EnumSelectionType.Position}>-<${EnumSelectionType.Board}>-<${EnumSelectionType.List}>-<${EnumSelectionType.MultiLabels}>-<${EnumSelectionType.MultiChecklists}>-<${EnumSelectionType.MultiUsers}>-<${EnumSelectionType.MultiDates}>`,

  // <AddRemove> the <CardLabel> label to the card
  AddRemoveLabel = `<${EnumSelectionType.AddRemove}>-the-<${EnumSelectionType.CardLabel}>-label-to-the-card`,

  // remove <RemoveFromCard> from the card
  RemoveFromCard = `remove-<${EnumSelectionType.RemoveFromCard}>-from-the-card`,

  // CASCADE ACTIONS
  // <CascadeAction> the <CardOrder> card linked in the attachments
  FindCardLinkedInAttachments = `<${EnumSelectionType.CascadeAction}>-the-<${EnumSelectionType.CardOrder}>-card-linked-in-the-attachments`,

  // <CascadeAction> a card titled <TextTitle> in board <OptionalBoard> in list <OptionalList>
  FindCardByTitle = `<${EnumSelectionType.CascadeAction}>-a-card-titled-<${EnumInputType.TextTitle}>-in-board-<${EnumSelectionType.OptionalBoard}>-in-list-<${EnumSelectionType.OptionalList}>`,

  // <Action> the cards together
  LinkUnlinkCards = `<${EnumSelectionType.Action}>-the-cards-together`,

  // calculate custom field using mathematical expression
  CalculateCustomField = `calculate-custom-field-<${EnumSelectionType.Target}>-using-<${EnumSelectionType.Expression}>`,

  // Telegram notifications
  SendTelegramChannelNotification = `send-telegram-notification-to-<${EnumSelectionType.TelegramChannel}>-with-message-<${EnumSelectionType.TextInput}>-and-custom-fields-<${EnumSelectionType.MultiFields}>`,
  SendTelegramForumNotification = `send-telegram-forum-notification-to-<${EnumSelectionType.TelegramChannel}>-thread-<${EnumSelectionType.ThreadId}>-with-message-<${EnumSelectionType.TextInput}>-and-custom-fields-<${EnumSelectionType.MultiFields}>`,
}

// filter type
export enum EnumTriggerCardFilterGroupType {
  Basic = "basic",
  Dates = "dates",
  Checklists = "checklists",
  Content = "content",
  Fields = "fields",
}

export enum EnumTiggerCarFilterType {
  CardInclusionInList = `<${EnumSelectionType.Inclusion}>-list-<${EnumSelectionType.List}>`,
  LabelInclusionInCard = `<${EnumSelectionType.Inclusion}>-the-<${EnumSelectionType.CardLabel}>-label`,
  CardAssignment = `<${EnumSelectionType.Assignment}>-<${EnumSelectionType.AssignmentSubject}>`,

  CardDueDates = `<${EnumSelectionType.Inclusion}>-a-date`,
  CardStartDate = `<${EnumSelectionType.Inclusion}>-a-start-date`,
  CardDateStatus = `<${EnumSelectionType.DateStatus}>-<${EnumSelectionType.TimeRange}>`,
  CardDateStatusWithSpecificDays = `<${EnumSelectionType.DateStatus}>-<${EnumSelectionType.TimeComparison}>-[${EnumInputType.Number}]-<${EnumSelectionType.TimeUnit}>`,

  CardChecklist = `<${EnumSelectionType.ChecklistConditionOperator}>`,

  CardContentTileDescription = `with-<${EnumSelectionType.CardContentType}>-<${EnumSelectionType.TextComparison}>-[${EnumInputType.Text}]`,
  CardContentDescriptionInclusion = `<${EnumSelectionType.Inclusion}>-an-empty-description`,

  CardCustomField1 = `<${EnumSelectionType.Inclusion}>-all-custom-fields-<${EnumSelectionType.Completion}>`,
  CardCustomField2 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-<${EnumSelectionType.Completion}>`,
  CardCustomField3 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-<${EnumSelectionType.CustomFieldAction}>`,
  CardCustomField4 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-set-to-<${EnumInputType.FieldValue}>`,
  CardCustomField5 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-<${EnumSelectionType.CheckboxState}>`,
  CardCustomField6 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-set-to-a-number-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]`,
  CardCustomField7 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-set-to-a-date-<${EnumSelectionType.Inclusion}>-<${EnumSelectionType.TimeRange}>`,
  CardCustomField8 = `<${EnumSelectionType.Inclusion}>-custom-field-<${EnumSelectionType.CustomField}>-set-to-a-date-<${EnumSelectionType.TimeComparison}>-[${EnumInputType.Number}]-<${EnumSelectionType.TimeUnit}>-<${EnumSelectionType.TimeRelativeReference}>`,
}

// (backend will handle trigger metadata mapping)
