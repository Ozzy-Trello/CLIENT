import { FC } from "react";
import { DashcardFilter } from "@myTypes/dashcard";
import { BahanSelection } from "@components/selection";
import SelectionItemFilter from "../selection-item-filter";
import { useBahans } from "@hooks/useBahans";

const BahanItemFilter: FC<DashcardFilter> = (props) => {
  return (
    <SelectionItemFilter
      {...props}
      filterType="bahan"
      SelectionComponent={BahanSelection}
      fetchDataHook={useBahans}
      selectionProps={{ placeholder: "Select bahan" }}
    />
  );
};

export default BahanItemFilter;
