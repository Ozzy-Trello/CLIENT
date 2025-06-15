export enum EnumOptionPosition {
  BottomOfList = "bottom-of-list",
  TopOfList = "top-of-list",
  NextList = "next-list",
  PreviousList = "previous-list",
}

export enum EnumOptionsNumberComparisonOperators {
  Exactly = "exactly",
  FewerThan = "fewer-than",
  MoreThan = "more-than",
}

export enum EnumOptionTextComparisonOperator {
  StartingWith = "starting-with",
  EndingWith = "ending-with",
  Containing = "containing",
  NotStartingWith = "not-starting-with",
  NotEndingWith = "not-ending-with",
  NotContaining = "containing",
}

export enum EnumOptionSubject {
  Iam = "i-am",
  SomeoneIs = "someone-is"
}

export enum EnumOptionBySubject {
  ByAnyone = "by-anyone",
  ByMe = "by-me",
  BySpecificUser = "by-specific-user",
  ByAnyoneExceptMe = "by-anyone-except-me",
  ByAnyoneExceptSpecificUser = "by-anyone-except-specific-user",
}

export enum EnumOptionsSet {
  Set = "set",
  Cleared = "cleared",
}

export enum EnumOptionCardMarking {
  Complete = "complete",
  Incomplete = "incomplete"
}

export enum EnumOptionArticleType {
  The = "the",
  Any = "any"
}

export enum EnumInclusionOperator {
  In = "in",
  NotIn = "not-in",
  With = "with",
  Without = "without"
}

export enum EnumAssignmentOperator {
  AssignedTo = "assigned-to",
  AssignedOnlyTo = "assigned-only-to",
  NotAssignedTo = "not-assigned-to"
}

export enum EnumAssignmentSubjectOperator {
  Me = "me",
  Anyone = "anyone",
  Member = "member"
}