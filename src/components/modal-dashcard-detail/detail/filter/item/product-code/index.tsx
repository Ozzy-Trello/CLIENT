import { FC } from "react";
import { DashcardFilter } from "@myTypes/dashcard";
import { ProductCodeSelection } from "@components/selection";
import SelectionItemFilter from "../selection-item-filter";
import { useProductCodes } from "@hooks/useProductCodes";

const ProduceCodeItemFilter: FC<DashcardFilter> = (props) => {
  return (
    <SelectionItemFilter
      {...props}
      filterType="product_code"
      SelectionComponent={ProductCodeSelection}
      fetchDataHook={useProductCodes}
      labelKey="code"
      selectionProps={{ placeholder: "Select kode produk" }}
    />
  );
};

export default ProduceCodeItemFilter;
