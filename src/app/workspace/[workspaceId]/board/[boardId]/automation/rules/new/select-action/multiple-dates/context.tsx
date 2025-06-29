import {
  createContext,
  Dispatch,
  FC,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { TValueDate } from "./type";

interface IMultipleDatesContext {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;

  valueDates: TValueDate[];
  setValueDates: Dispatch<SetStateAction<TValueDate[]>>;

  removeValueDate: (index: number) => void;
}

const MultipleDatesContext = createContext<IMultipleDatesContext | undefined>(
  undefined
);

interface MultipleDatesProviderProps {
  children: React.ReactNode;
}

export const MultipleDatesProvider: FC<MultipleDatesProviderProps> = ({
  children,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [valueDates, setValueDates] = useState<TValueDate[]>([]);

  const removeValueDate = (index: number) => {
    const copy = [...valueDates];
    copy.splice(index, 1);
    setValueDates(copy);
  };

  return (
    <MultipleDatesContext.Provider
      value={{ open, setOpen, valueDates, setValueDates, removeValueDate }}
    >
      {children}
    </MultipleDatesContext.Provider>
  );
};

export const useMultipleDatesContext = () => {
  const context = useContext(MultipleDatesContext);
  if (!context) {
    throw new Error(
      "useMultipleDatesContext must be used within a MultipleDatesProvider"
    );
  }
  return context;
};
