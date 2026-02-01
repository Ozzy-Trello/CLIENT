import { FC, useMemo } from "react";
import { DashcardFilter, dashcardsFilter, FilterOperator } from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";
import { Button, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { ProductSelection } from "@components/selection";
import SelectionItemFilter from "../selection-item-filter";
import { useProducts } from "@hooks/useProducts";

const ProductItemFilter: FC<DashcardFilter> = (props) => {
  return (
    <SelectionItemFilter
      {...props}
      filterType="product"
      SelectionComponent={ProductSelection}
      fetchDataHook={useProducts}
      selectionProps={{ placeholder: "Select product" }}
    />
  );
};

export default ProductItemFilter;
