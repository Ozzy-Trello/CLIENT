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
  if (item.type === "board") return <BoardItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "list") return <ListItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "assigned") return <AssignedItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "custom_field") return <CustomFieldItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "due_date") return <DueItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "labels") return <LabelsItemFilter {...item} id={item.id} label={item.label} />;

  if (item.type === "is_completed") return <CompleteItemFilter {...item} id={item.id} label={item.label} />;

  return null;
};

export default ItemFilter;
