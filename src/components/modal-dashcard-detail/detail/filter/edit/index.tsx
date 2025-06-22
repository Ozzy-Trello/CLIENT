import { Button, Select } from "antd";
import { FC, useMemo } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { useCardDetailContext } from "@providers/card-detail-context";
import ItemFilter from "../item";
import { useCustomFields } from "@hooks/custom_field";
import { useParams } from "next/navigation";
import {
  DashcardFilter,
  dashcardsFilter,
  EnumCardAttributeType,
  FilterOperator,
} from "@myTypes/dashcard";
import { CustomField } from "@myTypes/custom-field";
import { Plus } from "lucide-react";

const EditFilter: FC = () => {
  const params = useParams();
  const { currentFilter, setOpenEditFilter, setCurrentFilter, isUpdatingCard } =
    useCardDetailContext();

  const { customFields } = useCustomFields(
    Array.isArray(params.workspaceId)
      ? params.workspaceId[0]
      : params.workspaceId
  );

  const availableFilters = useMemo(() => {
    const customFieldFilters: DashcardFilter[] = customFields.map(
      (item: CustomField) => ({
        id: item.id,
        label: item.name,
        groupType: "custom",
        type: EnumCardAttributeType.CUSTOM_FIELD,
        value: "",
        operator: "equals" as FilterOperator,
        options: [
          { label: "any", value: "any" },
          { label: "select", value: "select" },
        ],
      })
    );

    // Create a Map to ensure unique filters by ID
    const uniqueFiltersMap = new Map<string, DashcardFilter>();

    // Add dashcard filters first
    dashcardsFilter.forEach((filter) => {
      uniqueFiltersMap.set(filter.id, filter);
    });

    // Then add custom field filters, potentially overwriting any duplicates
    customFieldFilters.forEach((filter) => {
      uniqueFiltersMap.set(filter.id, filter);
    });

    // Convert Map to array
    const allFilters = Array.from(uniqueFiltersMap.values());

    // Filter out items already in currentFilter
    const availableFilters = allFilters.filter(
      (filter) =>
        !currentFilter?.some(
          (currentFilterItem) => currentFilterItem.id === filter.id
        )
    );

    return availableFilters;
  }, [customFields, currentFilter]);

  const addFilter = (id: string) => {
    const findFilter = availableFilters.find((filter) => filter.id === id);
    if (!findFilter) return;
    setCurrentFilter([...currentFilter, findFilter]);
  };

  return (
    <div className="w-full p-3 bg-gray-100 flex flex-col gap-3 rounded-lg shadow-sm">
      {currentFilter?.map((filter) => (
        <ItemFilter key={filter.id} item={filter} />
      ))}

      {availableFilters.length > 0 && (
        <Select
          className="w-48 mt-2"
          placeholder="Add more filters"
          size="small"
          options={availableFilters.map((f) => ({
            label: f.label,
            value: f.id,
          }))}
          onChange={addFilter}
          value={null}
          suffixIcon={<Plus size={16} />}
        />
      )}

      <div className="flex items-center gap-3">
        <Button
          loading={isUpdatingCard}
          onClick={() => setOpenEditFilter(false)}
        >
          Save
        </Button>
        <Button onClick={() => setOpenEditFilter(false)}>Cancel</Button>
        {isUpdatingCard && (
          <div className="flex items-center gap-3">
            <LoadingOutlined />
            <div className="text-sm italic">Loading Result ...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditFilter;
