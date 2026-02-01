export type TOptionDate<T = string> = {
  value: T;
  label: string;
};

export type TSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
};

export type TValueDate = {
  type: string;
  display: string;
} & Record<string, string>;
