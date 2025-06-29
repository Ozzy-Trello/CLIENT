import { TOptionDate } from "./type";
import {
  EnumDay,
  EnumDayType,
  EnumMonth,
  EnumMonthPlacement,
  EnumPlacement,
  EnumPlacement2,
  EnumSetDate,
  EnumTimeType,
} from "@myTypes/options";

export const TYPE_SET_DATE: TOptionDate<EnumSetDate>[] = [
  {
    value: EnumSetDate.Due,
    label: "Due",
  },
  {
    value: EnumSetDate.Start,
    label: "Start",
  },
];

export const TYPE_DAY: TOptionDate<EnumDayType>[] = [
  {
    value: EnumDayType.Now,
    label: "Now",
  },
  {
    value: EnumDayType.Today,
    label: "Today",
  },
  {
    value: EnumDayType.Tomorrow,
    label: "Tomorrow",
  },
  {
    value: EnumDayType.Yesterday,
    label: "Yesterday",
  },
];

export const TYPE_TIME: TOptionDate<EnumTimeType>[] = [
  {
    value: EnumTimeType.Minutes,
    label: "Minutes",
  },
  {
    value: EnumTimeType.Hours,
    label: "Hours",
  },
  {
    value: EnumTimeType.Days,
    label: "Days",
  },
  {
    value: EnumTimeType.WorkingDays,
    label: "Working Days",
  },
  {
    value: EnumTimeType.Weeks,
    label: "Weeks",
  },
  {
    value: EnumTimeType.Months,
    label: "Months",
  },
];

export const DAY: TOptionDate<EnumDay>[] = [
  {
    value: EnumDay.WorkingDay,
    label: "Working Day",
  },
  {
    value: EnumDay.Monday,
    label: "Monday",
  },
  {
    value: EnumDay.Tuesday,
    label: "Tuesday",
  },
  {
    value: EnumDay.Wednesday,
    label: "Wednesday",
  },
  {
    value: EnumDay.Thursday,
    label: "Thursday",
  },
  {
    value: EnumDay.Friday,
    label: "Friday",
  },
  {
    value: EnumDay.Saturday,
    label: "Saturday",
  },
  {
    value: EnumDay.Sunday,
    label: "Sunday",
  },
];

export const PLACEMENT: TOptionDate<EnumPlacement>[] = [
  {
    value: EnumPlacement["1st"],
    label: "The 1st",
  },
  {
    value: EnumPlacement["2nd"],
    label: "The 2nd",
  },
  {
    value: EnumPlacement["3rd"],
    label: "The 3rd",
  },
  {
    value: EnumPlacement["4th"],
    label: "The 4th",
  },
  {
    value: EnumPlacement["5th"],
    label: "The 5th",
  },
  {
    value: EnumPlacement["6th"],
    label: "The 6th",
  },
  {
    value: EnumPlacement["7th"],
    label: "The 7th",
  },
  {
    value: EnumPlacement["8th"],
    label: "The 8th",
  },
  {
    value: EnumPlacement["9th"],
    label: "The 9th",
  },
  {
    value: EnumPlacement["10th"],
    label: "The 10th",
  },
  {
    value: EnumPlacement["11th"],
    label: "The 11th",
  },
  {
    value: EnumPlacement["12th"],
    label: "The 12th",
  },
  {
    value: EnumPlacement["13th"],
    label: "The 13th",
  },
  {
    value: EnumPlacement["14th"],
    label: "The 14th",
  },
  {
    value: EnumPlacement["15th"],
    label: "The 15th",
  },
  {
    value: EnumPlacement["16th"],
    label: "The 16th",
  },
  {
    value: EnumPlacement["17th"],
    label: "The 17th",
  },
  {
    value: EnumPlacement["18th"],
    label: "The 18th",
  },
  {
    value: EnumPlacement["19th"],
    label: "The 19th",
  },
  {
    value: EnumPlacement["20th"],
    label: "The 20th",
  },
  {
    value: EnumPlacement["21st"],
    label: "The 21st",
  },
  {
    value: EnumPlacement["22nd"],
    label: "The 22nd",
  },
  {
    value: EnumPlacement["23rd"],
    label: "The 23rd",
  },
  {
    value: EnumPlacement["24th"],
    label: "The 24th",
  },
  {
    value: EnumPlacement["25th"],
    label: "The 25th",
  },
  {
    value: EnumPlacement["26th"],
    label: "The 26th",
  },
  {
    value: EnumPlacement["27th"],
    label: "The 27th",
  },
  {
    value: EnumPlacement["28th"],
    label: "The 28th",
  },
  {
    value: EnumPlacement["29th"],
    label: "The 29th",
  },
  {
    value: EnumPlacement["30th"],
    label: "The 30th",
  },
  {
    value: EnumPlacement["31st"],
    label: "The 31st",
  },

  {
    value: EnumPlacement.LastDay,
    label: "Last Day",
  },
  {
    value: EnumPlacement.LastWorkingDay,
    label: "Last Working Day",
  },
];

export const MONTH_PLACEMENT: TOptionDate<EnumMonthPlacement>[] = [
  {
    value: EnumMonthPlacement.ThisMonth,
    label: "This Month",
  },
  {
    value: EnumMonthPlacement.NextMonth,
    label: "Next Month",
  },
];

export const PLACEMENT2: TOptionDate<EnumPlacement2>[] = [
  {
    value: EnumPlacement2.First,
    label: "First",
  },
  {
    value: EnumPlacement2.Second,
    label: "Second",
  },
  {
    value: EnumPlacement2.Third,
    label: "Third",
  },
  {
    value: EnumPlacement2.Fourth,
    label: "Fourth",
  },
  {
    value: EnumPlacement2.Last,
    label: "Last",
  },
];

export const MONTH: TOptionDate<EnumMonth>[] = [
  {
    value: EnumMonth.January,
    label: "January",
  },
  {
    value: EnumMonth.February,
    label: "February",
  },
  {
    value: EnumMonth.March,
    label: "March",
  },
  {
    value: EnumMonth.April,
    label: "April",
  },
  {
    value: EnumMonth.May,
    label: "May",
  },
  {
    value: EnumMonth.June,
    label: "June",
  },
  {
    value: EnumMonth.July,
    label: "July",
  },
  {
    value: EnumMonth.August,
    label: "August",
  },
  {
    value: EnumMonth.September,
    label: "September",
  },
  {
    value: EnumMonth.October,
    label: "October",
  },
  {
    value: EnumMonth.November,
    label: "November",
  },
  {
    value: EnumMonth.December,
    label: "December",
  },

];
