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
  AssignmentSubject = "assignment_subject"
}

export enum EnumInputType {
  Number = "number",
  Text = "text",
  FieldValue = "field_value",
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

  // add more..
}

export enum ActionType {
  ActionTheCardToPositionInSpecificList = `<${EnumSelectionType.Action}>-the-card-to-<${EnumSelectionType.Position}>-<${EnumSelectionType.List}>`,
  ActionTheCardToPosition = `<action>-the-card-to-<${EnumSelectionType.Position}>`,
  ArchivalActionTheCard = `<${EnumSelectionType.Action}>-the-card`,
  NotifyTheCard = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-<${EnumSelectionType.User}>-with-message-<${EnumSelectionType.TextInput}>`,
  NotifySelectedUser = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-${EnumTextType.SelectedUser}-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  NotifyUserFromCustomFields = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-users-from-<${EnumSelectionType.Fields}>-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  //add more..
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
  CardAssignment = `<${EnumSelectionType.Assignment}>-<${EnumSelectionType.AssignmentSubject}>`
}
