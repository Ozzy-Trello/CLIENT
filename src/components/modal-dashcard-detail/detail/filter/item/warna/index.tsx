import { FC } from "react";
import { DashcardFilter } from "@myTypes/dashcard";
import { WarnaSelection } from "@components/selection";
import SelectionItemFilter from "../selection-item-filter";
import { useWarnas } from "@hooks/useWarnas";

const WarnaItemFilter: FC<DashcardFilter> = (props) => {
  return (
    <SelectionItemFilter
      {...props}
      filterType="warna"
      SelectionComponent={WarnaSelection}
      fetchDataHook={useWarnas}
      selectionProps={{ placeholder: "Select warna" }}
    />
  );
};

export default WarnaItemFilter;
