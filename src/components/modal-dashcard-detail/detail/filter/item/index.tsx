import { FC } from "react";
import { DashcardFilter } from "@myTypes/dashcard";
import BoardItemFilter from "./board";
import ListItemFilter from "./list";
import AssignedItemFilter from "./assigned";
import CustomFieldItemFilter from "./custom-field";
import DueItemFilter from "./due";
import LabelsItemFilter from "./label";
import CompleteItemFilter from "./complete";

interface ItemFilterProps {
  item: DashcardFilter;
}

const ItemFilter: FC<ItemFilterProps> = ({ item }) => {
  if (item.type === "board") return <BoardItemFilter {...item} />;

  if (item.type === "list") return <ListItemFilter {...item} />;

  if (item.type === "assigned") return <AssignedItemFilter {...item} />;

  if (item.type === "custom_field") return <CustomFieldItemFilter {...item} />;

  if (item.type === "due_date") return <DueItemFilter {...item} />;

  if (item.type === "labels") return <LabelsItemFilter {...item} />;

  if (item.type === "is_completed") return <CompleteItemFilter {...item} />;

  return null;
};

export default ItemFilter;
