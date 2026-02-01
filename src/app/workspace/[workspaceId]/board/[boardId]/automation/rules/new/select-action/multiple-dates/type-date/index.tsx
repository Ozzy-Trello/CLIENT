import { FC } from "react";
import TypeDate1 from "./1";
import TypeDate2 from "./2";
import TypeDate3 from "./3";
import TypeDate4 from "./4";
import TypeDate5 from "./5";
import TypeDate6 from "./6";
import TypeDate7 from "./7";

const TypeDate: FC = () => {
  return (
    <div className="flex flex-col gap-3">
      <TypeDate1 />
      <TypeDate2 />
      <TypeDate3 />
      <TypeDate4 />
      <TypeDate5 />
      <TypeDate6 />
      <TypeDate7 />
    </div>
  );
};

export default TypeDate;
