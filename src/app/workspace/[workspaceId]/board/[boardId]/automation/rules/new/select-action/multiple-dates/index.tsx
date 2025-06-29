import { Popover } from "antd";
import { Calendar, Trash2 } from "lucide-react";
import { FC } from "react";
import TypeDate from "./type-date";
import { useMultipleDatesContext } from "./context";

const MultipleDates: FC = () => {
  const { open, setOpen, valueDates, removeValueDate } =
    useMultipleDatesContext();

  return (
    <div className="flex items-center gap-2">
      {valueDates.map((item, index) => (
        <div
          key={index}
          className="px-3 py-1 bg-gray-50 rounded-lg flex justify-between items-center gap-4"
        >
          <div>{item.display}</div>
          <Trash2
            size={12}
            className="cursor-pointer"
            onClick={() => removeValueDate(index)}
          />
        </div>
      ))}

      <Popover
        content={<TypeDate />}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="w-6 h-6 border flex items-center justify-center border-gray-400 cursor-pointer hover:border-white duration-300">
          <Calendar size={12} />
        </div>
      </Popover>
    </div>
  );
};

export default MultipleDates;
