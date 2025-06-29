import { AutomationRuleTrigger } from "./type";

export const enum TriggerGroupType {
  CardMove = "card.move",
  CardChanges = "card.changes",
  CardDates = "card.dates",
  CardChecklist = "card.checklists",
  CardContent = "card.content",
  CardFields = "card.fields",
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
  Marked = "marked",
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
  Channel = "channel",
  TextInput = "text_input",
  User = "user",
  Fields = "fields",
  FieldValue = "field_value",
  MultiFields = "multi_fields",
  Set = "set",
  ArticleType = "article_type", //[the, any]
  Subject = "subject", //[i am, someone is]
  Inclusion = "inclusion",
  CardLabel = "card_label",
  Assignment = "assignment",
  AssignmentSubject = "assignment_subject",
  Direction = "direction",
  DateExpression = "date_expression",
  State = "state", // checkbox checked/unchecked state
  ChecklistScope = "checklist_scope", // checklist / a checklist / all checklists
  ItemScope = "item_scope",
  DateValue = "date_value",
  CreateType = "create_type", // new | unique
  CreateTypeItem = "create_type_item", // regular | board | link | separator | mirror
  MultiLabels = "multi_labels",
  MultiChecklists = "multi_checklists",
  MultiUsers = "multi_users",
  MultiDates = "multi_dates",
  AddRemove = "add_remove",
  RemoveFromCard = "remove_from_card",
}

export enum EnumInputType {
  Number = "number",
  Text = "text",
  FieldValue = "field_value",
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

  // "when-a-<filter>-is-<action*>" archival action
  WhenACardHasArchivalAction = `when-a-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>`,

  // "when-a-list-is-<action*>-<by>",
  WhenAListIsAction = `when-a-list-is-${EnumSelectionType.Action}-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-list-<list*>-has-<number-comparison*>-[number]"
  WhenListHasCards = `when-list-<${EnumSelectionType.List}>-has-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]`,

  // CARD CHANGES
  WhenCardCompletionChanges = `when-the-card-is-marked-<${EnumSelectionType.Marked}>-in-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenCardLabelChanges = `when-<${EnumSelectionType.ArticleType}>-label-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenCardAttachmentChanges = `when-an-attachment-<${EnumSelectionType.TextComparison}>-[${EnumInputType.Text}]-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,
  WhenCardMemberChanges = `when-<${EnumSelectionType.Subject}>-is-<${EnumSelectionType.Action}>-a-card-<${EnumSelectionType.OptionalFilter}>-<${EnumSelectionType.OptionalBySubject}>`,

  // CUSTOM FIELDS
  // "when-custom-fields-<fields>-is-set-to-<field_value>-<optional_by>"
  WhenCustomFieldsIsSetToFieldValue = `when-custom-fields-<${EnumSelectionType.Fields}>-is-set-to-<${EnumInputType.FieldValue}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-fields-<fields>-is-<action>-<optional_by>"
  WhenCustomFieldsIsSet = `when-custom-fields-<${EnumSelectionType.Fields}>-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-<state>-<optional_by>"
  WhenCustomFieldIsChecked = `when-custom-field-<${EnumSelectionType.Fields}>-is-<${EnumSelectionType.State}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-set-to-a-number-<number_comparison>-[number]-<optional_by>"
  WhenCustomFieldNumberComparison = `when-custom-field-<${EnumSelectionType.Fields}>-is-set-to-a-number-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-field-<fields>-is-set-to-a-date-<date_expression>-<optional_by>"
  WhenCustomFieldDateCondition = `when-custom-field-<${EnumSelectionType.Fields}>-is-set-to-a-date-<${EnumSelectionType.DateExpression}>-<${EnumSelectionType.OptionalBySubject}>`,

  // NEW TRIGGERS
  // "when all the custom fields are completed"
  WhenAllCustomFieldsAreCompleted = `when-all-the-custom-fields-are-completed`,

  // "when custom fields <fields> are completed"
  WhenCustomFieldsAreCompleted = `when-custom-fields-<${EnumSelectionType.Fields}>-are-completed`,

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

  // add more..
}

export enum ActionType {
  ActionTheCardToPositionInSpecificList = `<${EnumSelectionType.Action}>-the-card-to-<${EnumSelectionType.Position}>-<${EnumSelectionType.List}>`,
  ActionTheCardToPosition = `<action>-the-card-to-<${EnumSelectionType.Position}>`,
  ArchivalActionTheCard = `<${EnumSelectionType.Action}>-the-card`,
  NotifyTheCard = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-<${EnumSelectionType.User}>-with-message-<${EnumSelectionType.TextInput}>`,
  NotifySelectedUser = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-${EnumTextType.SelectedUser}-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  NotifyUserFromCustomFields = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-users-from-<${EnumSelectionType.Fields}>-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  ClearCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>`,
  SetCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>-to-<${EnumInputType.FieldValue}>`,
  CheckCustomField = `<${EnumSelectionType.Action}>-custom-field-<${EnumSelectionType.Fields}>`,
  IncrementCustomField = `<${EnumSelectionType.Action}>-the-number-in-custom-field-<${EnumSelectionType.Fields}>-by-[${EnumInputType.Number}]`,
  SetDateCustomField = `set-date-custom-field-<${EnumSelectionType.Fields}>-to-<${EnumInputType.DateValue}>`,
  MoveDateCustomField = `move-date-in-custom-field-<${EnumSelectionType.Fields}>-to-<${EnumInputType.DateValue}>`,
  //add more..

  // create a <CardType> <CardTypeItem> card with title <TextTitle> <TextDescription> <Position> <List> <Board> <MultiLabels> <MultiChecklists> <MultiUsers> <MultiDates>
  CreateItem = `create-a-<${EnumSelectionType.CreateType}>-card-with-title-<${EnumInputType.TextTitle}>-<${EnumInputType.TextDescription}>-<${EnumSelectionType.Position}>-<${EnumSelectionType.List}>-<${EnumSelectionType.Board}>-<${EnumSelectionType.MultiLabels}>-<${EnumSelectionType.MultiChecklists}>-<${EnumSelectionType.MultiUsers}>-<${EnumSelectionType.MultiDates}>`,

  // <AddRemove> the <CardLabel> label to the card
  AddRemoveLabel = `<${EnumSelectionType.AddRemove}>-the-<${EnumSelectionType.CardLabel}>-label-to-the-card`,

  // remove <RemoveFromCard> from the card
  RemoveFromCard = `remove-<${EnumSelectionType.RemoveFromCard}>-from-the-card`,
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
}

// (backend will handle trigger metadata mapping)
