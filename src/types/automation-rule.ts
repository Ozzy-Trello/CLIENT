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
  OptionalAction = "optional_action",
  Position = "position",
  OptionalPosition = "optional_position",
  NumberComparison = "number_comparison*",
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
  MultiFields = "multi_fields",
  Set = "set",
}

export enum EnumInputType {
  Number = "number",
  FieldValue = "field_value",
}

export enum TriggerType {
  //  `when-a-card-<filter>-is-<action*>-the-board-<by>`,
  WhenACardActionOverBoard = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>-the-board-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-a-card-<filter>-is-<action*>-list-<list*>-<by>",
  WhenACardActionOverList = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>-list-<${EnumSelectionType.List}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-a-<filter>-is-<action*>" archival action
  WhenACardHasArchivalAction = `when-a-card-<${EnumSelectionType.OptionalFilter}>-is-<${EnumSelectionType.Action}>`,

  // "when-a-list-is-<action*>-<by>",
  WhenAListIsAction = `when-a-list-is-<${EnumSelectionType.Action}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-list-<list*>-has-<number-comparison*>-[number]"
  WhenListHasCards = `when-list-<${EnumSelectionType.List}>-has-<${EnumSelectionType.NumberComparison}>-[${EnumInputType.Number}]`,

  // "when-custom-fields-<fields>-is-set-to-<field_value>-<optional_by>"
  WhenCustomFieldsIsSetToFieldValue = `when-custom-fields-<${EnumSelectionType.Fields}>-is-set-to-<${EnumInputType.FieldValue}>-<${EnumSelectionType.OptionalBySubject}>`,

  // "when-custom-fields-<fields>-is-<set>-<optional_by>"
  WhenCustomFieldsIsSet = `when-custom-fields-<${EnumSelectionType.Fields}>-is-<${EnumSelectionType.Set}>-<${EnumSelectionType.OptionalBySubject}>`,

  // add more..
}

export enum ActionType {
  ActionTheCardToPositionInSpecificList = `<${EnumSelectionType.Action}>-the-card-to-<${EnumSelectionType.Position}>-<${EnumSelectionType.List}>`,
  ActionTheCardToPosition = `<action>-the-card-to-<${EnumSelectionType.Position}>`,
  ArchivalActionTheCard = `<${EnumSelectionType.Action}>-the-card`,
  NotifyTheCard = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-<${EnumSelectionType.User}>-with-message-<${EnumSelectionType.TextInput}>`,
  NotifySelectedUser = `<${EnumSelectionType.Action}>-the-user-via-<${EnumSelectionType.Channel}>-to-${EnumTextType.SelectedUser}-with-message-<${EnumSelectionType.TextInput}> and custom fields <${EnumSelectionType.MultiFields}>`,
  //add more..
}

// filter type
export enum EnumTriggerCardFilter {
  Basic = "basic",
  Dates = "dates",
  Checklists = "checklists",
  Content = "content",
  Fields = "fields",
}
