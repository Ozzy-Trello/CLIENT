export enum EnumUserActionEvent {
  CardCreated = "card.created",
  CardUpdated = "card.updated",
  CardRenamed = "card.renamed",
  CardMoved = "card.moved",
  CardCopied = "card.copied",
  CardArchived = "card.archived",
  CardUnarchived = "card.unarchived",
  CardLabelAdded = "card.label.added",
  CardMemberAdder = "card.member.added",
  CardCoverAdded = "card.cover.added",
  CardAttachmentAdded = "card.attachment.added",
  CardCustomFieldChange = "card.customfield.changed",
  CardCommentAdded = "card.comment.added",
  CardStartDateAdded = "card.startdate.added",
  CardDueDateAdded = "card.duedate.added",
  CardAddedTo = "card.added-to",
  CreatedIn = "card.created-in",
  CardEmailedTo = "card.emailed-to",
  CardMovedInto = "card.moved-into",
  CardMovedOutOf = "card.moved-out-of",
  ListCreated = "list.created",
  ListRenamed = "list.renamed",
  ListArchived = "list.archived",
  ListUnarchived = "list.unarchived"
}

export enum EnumActions {
  MoveCard = "move.card",
  CopyCard = "copy.card",
  ArchiveCard = "archive.card",
  UnarchiveCard = "unarchive.card",
}