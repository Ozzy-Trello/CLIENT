import { FC, useMemo } from "react";
import { Button, Select } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
    DashcardFilter,
    dashcardsFilter,
    FilterOperator,
} from "@myTypes/dashcard";
import { useCardDetailContext } from "@providers/card-detail-context";
import { convertOperatorToText } from "@components/modal-dashcard-detail/util";

interface SelectionItemFilterProps extends DashcardFilter {
    filterType: string; // The type used to lookup options in dashcardsFilter (e.g. 'product', 'bahan')
    SelectionComponent: React.ComponentType<any>;
    fetchDataHook: (options?: any) => { data: any[] | undefined };
    labelKey?: string; // Property to use for display label (default: 'name')
    selectionProps?: Record<string, any>; // Additional props for SelectionComponent
}

const SelectionItemFilter: FC<SelectionItemFilterProps> = ({
    id,
    operator,
    value,
    label,
    displayValue,
    filterType,
    SelectionComponent,
    fetchDataHook,
    labelKey = "name",
    selectionProps = {},
}) => {
    const {
        openEditFilter,
        currentFilter,
        handleChangeFilter,
        handleDeleteFilter,
    } = useCardDetailContext();

    const options = useMemo(() => {
        return (
            dashcardsFilter.find((filter) => filter.id === filterType)?.options ?? []
        );
    }, [filterType]);

    const valueEdit = useMemo(() => {
        return currentFilter.find((filter) => filter.id === id);
    }, [currentFilter, id]);

    // Check if the current operator requires no input
    const isNoValueInput = useMemo(() => {
        const op = valueEdit?.operator;
        return (
            op === FilterOperator.ANY ||
            op === FilterOperator.ANY_VALUE ||
            op === FilterOperator.NO_VALUE
        );
    }, [valueEdit?.operator]);

    // Check if the current operator requires multi-select
    const isMultiSelect = useMemo(() => {
        const op = valueEdit?.operator;
        return (
            op === FilterOperator.IS_ONE_OF || op === FilterOperator.IS_NOT_ONE_OF
        );
    }, [valueEdit?.operator]);

    // Fetch data for name resolution
    const { data: listData } = fetchDataHook();

    const resolvedDisplayValue = useMemo(() => {
        if (displayValue) return displayValue;
        if (!value) return "";

        // Try to resolve using fetched data
        if (listData && listData.length > 0) {
            if (Array.isArray(value)) {
                return value
                    .map((v) => {
                        const found = listData.find((item: any) => item.id === v);
                        return found ? found[labelKey] : v;
                    })
                    .join(", ");
            } else {
                const found = listData.find((item: any) => item.id === value);
                if (found) return found[labelKey];
            }
        }

        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value.join(", ");
        return String(value);
    }, [displayValue, value, listData, labelKey]);

    if (openEditFilter)
        return (
            <div className="flex items-center gap-3 justify-between">
                <div className="flex gap-3 items-center">
                    <div className="font-semibold min-w-16">{label}</div>
                    <div className="p-2 rounded-lg w-full">
                        <Select
                            options={options}
                            value={valueEdit?.operator}
                            onChange={(newOp) => handleChangeFilter({ id, operator: newOp })}
                            className="w-full"
                        />
                    </div>
                    {!isNoValueInput && (
                        <div className="p-2 rounded-lg">
                            <SelectionComponent
                                value={(valueEdit?.value as string) ?? ""}
                                onChange={(selectedValue: string) =>
                                    handleChangeFilter({ id, value: selectedValue })
                                }
                                size="small"
                                mode={isMultiSelect ? "multiple" : undefined}
                                {...selectionProps}
                            />
                        </div>
                    )}
                </div>
                <Button
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteFilter(filterType, id)}
                />
            </div>
        );

    return (
        <div className="flex items-center gap-3">
            <div className="font-semibold min-w-16">{label}</div>
            <div className="border p-2 rounded-lg border-gray-200">
                {convertOperatorToText(operator ?? "")}
            </div>
            <div className="border p-2 rounded-lg border-gray-200">
                {resolvedDisplayValue}
            </div>
        </div>
    );
};

export default SelectionItemFilter;
