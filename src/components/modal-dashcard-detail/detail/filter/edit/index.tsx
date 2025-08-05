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
        operator: "any_value" as FilterOperator,
        options: [
          { label: "has a value", value: "any_value" },
          { label: "has no value", value: "no_value" },
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

    // For custom fields, filter out already selected ones to prevent duplicates
    // For other filter types, always keep them available for multiple instances
    const availableFilters = allFilters.filter((filter) => {
      if (filter.type === EnumCardAttributeType.CUSTOM_FIELD) {
        // For custom fields, check if base ID is already selected
        const selectedCustomFieldIds = currentFilter
          ?.filter((f) => f.type === EnumCardAttributeType.CUSTOM_FIELD)
          .map((f) => f.id.split('_')[0]); // Get base ID without instance suffix
        return !selectedCustomFieldIds?.includes(filter.id);
      }
      // For other filter types, always keep them available for multiple instances
      return true;
    });

    return availableFilters;
  }, [customFields, currentFilter]);

  const addFilter = (id: string) => {
    const filterTemplate = availableFilters.find((filter) => filter.id === id);
    if (!filterTemplate) return;

    // Create a new instance with a unique ID while preserving the original type
    const timestamp = Date.now();
    const instanceId = `${id}_${timestamp}`;
    
    // Count existing instances of this filter type for display purposes
    const existingInstances = currentFilter.filter(f => f.type === filterTemplate.type).length;
    const instanceNumber = existingInstances + 1;
    
    const newFilterInstance: DashcardFilter = {
      ...filterTemplate,
      id: instanceId,
      label: existingInstances > 0 ? `${filterTemplate.label} #${instanceNumber}` : filterTemplate.label,
      // Keep the original type for backend compatibility
      type: filterTemplate.type,
      // Reset operator and value for new instance
      operator: filterTemplate.operator,
      value: undefined,
    };
    
    setCurrentFilter([...currentFilter, newFilterInstance]);
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
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
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
