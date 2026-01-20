import { SelectionRef, UserSelection } from "@components/selection";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { DatePicker, Input, Tooltip, message } from "antd";
import { List, StretchHorizontal, CheckSquare, Search, Loader2, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { EnumCustomFieldSource, EnumCustomFieldType } from "@myTypes/custom-field";
import { Card, CardCustomField } from "@myTypes/card";
import dayjs, { Dayjs } from "dayjs";

import { OptimisticCheckbox } from "./components/OptimisticCheckbox";
import { EnterToSaveInput } from "./components/EnterToSaveInput";
import { EnterToSaveNumberInput } from "./components/EnterToSaveNumberInput";
import { OptionAutoComplete } from "./components/OptionAutoComplete";
import { normalizeCheckboxValue, parseRoleSource } from "./utils";

interface CustomFieldsProps {
  card: Card | null;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

const CustomFields: React.FC<CustomFieldsProps> = (props) => {
  const { card } = props;
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;

  const {
    cardCustomFields,
    setStringValue,
    setNumberValue,
    setCheckboxValue,
    setDateValue,
    setOptionValue,
    clearOptionValue,
    setUserValue,
    isLoading,
    isUpdating,
  } = useCardCustomField(card?.id || "", workspaceId);

  const { canManageCardCustomFields, canUpdateCard } = useBoardPermissionsContext();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const userSelectionRefs = useRef<Map<string, SelectionRef>>(new Map());
  const [messageApi, contextHolder] = message.useMessage();

  const filteredCustomFields =
    cardCustomFields?.filter((field) => {
      if (!searchTerm) return true;
      return field.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];

  const handleSplitJobsSaved = () => {
    if (!cardCustomFields?.length) return;
    const cuttingField = cardCustomFields.find(
      (field) => field.name?.trim().toLowerCase() === "cutting"
    );
    if (cuttingField?.id) {
      setCheckboxValue(cuttingField.id, true);
    }
  };

  const renderFieldInput = (field: CardCustomField) => {
    if (!field.id) return null;

    const canView = field.canView !== undefined ? field.canView : true;
    const fieldCanEdit = field.canEdit !== undefined ? field.canEdit : true;
    const canEdit = canUpdateCard() && canManageCardCustomFields() && fieldCanEdit;

    if (!canView) return null;

    switch (field?.type) {
      case EnumCustomFieldType.Checkbox:
        return (
          <div className="w-full">
            <OptimisticCheckbox
              checked={normalizeCheckboxValue(
                field?.valueCheckbox,
                (field as any)?.value_checkbox
              )}
              onChange={(checked) =>
                canEdit ? setCheckboxValue(field.id!, checked) : undefined
              }
              disabled={!canEdit}
            />
          </div>
        );

      case EnumCustomFieldType.Text:
        return (
          <EnterToSaveInput
            placeholder={`Add ${field.name}...`}
            className={`w-full ${!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
            initialValue={field.valueString || ""}
            onSave={(value) => canEdit ? setStringValue(field.id!, value) : undefined}
            disabled={!canEdit}
          />
        );

      case EnumCustomFieldType.Number:
        return (
          <EnterToSaveNumberInput
            fieldName={field.name}
            placeholder={`Add ${field.name}...`}
            className={`w-full ${!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
            initialValue={field.valueNumber}
            customFieldId={field.id}
            onSave={(value) => canEdit ? setNumberValue(field.id!, value) : undefined}
            disabled={!canEdit}
            onSplitJobsSaved={handleSplitJobsSaved}
          />
        );

      case EnumCustomFieldType.Date:
        const dateValue = field.valueDate ? dayjs(field.valueDate) : null;
        return (
          <DatePicker
            className={`w-full ${!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
            placeholder={`Select ${field.name}...`}
            value={dateValue}
            onChange={(date: Dayjs | null) => {
              if (canEdit) {
                setDateValue(field.id!, date ? date.toDate() : null as any);
              }
            }}
            format="YYYY-MM-DD HH:mm"
            showTime={{ format: "HH:mm" }}
            allowClear
            disabled={!canEdit}
          />
        );

      case EnumCustomFieldType.Dropdown:
        if (field.source === EnumCustomFieldSource.User) {
          return (
            <UserSelection
              ref={(ref) => {
                if (ref && field.id) userSelectionRefs.current.set(field.id, ref);
              }}
              value={field.valueUserId}
              onChange={(value: string) =>
                canEdit && value ? setUserValue(field.id!, value) : undefined
              }
              placeholder={`Select ${field.name}...`}
              size="middle"
              disabled={!canEdit}
            />
          );
        } else if (field.source?.startsWith("user-role:")) {
          const roleIds = parseRoleSource(field.source);
          return (
            <UserSelection
              ref={(ref) => {
                if (ref && field.id) userSelectionRefs.current.set(field.id, ref);
              }}
              value={field.valueUserId}
              onChange={(value: string) =>
                canEdit && value ? setUserValue(field.id!, value) : undefined
              }
              placeholder={`Select ${field.name}...`}
              size="middle"
              className={`w-full ${!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
              roleIds={roleIds}
              disabled={!canEdit}
            />
          );
        } else {
          const options = [
            { label: "-", value: "__CLEAR__" },
            ...(field?.options || []),
          ];
          return (
            <OptionAutoComplete
              options={options}
              value={field.valueOption as string}
              onChange={(value) => {
                if (!canEdit) return;
                if (value === "__CLEAR__") {
                  clearOptionValue(field.id!);
                } else if (value) {
                  setOptionValue(field.id!, value);
                }
              }}
              placeholder={`Select ${field.name}...`}
              disabled={!canEdit}
              className={!canEdit ? "bg-gray-100 cursor-not-allowed" : ""}
            />
          );
        }

      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  const getFieldIcon = (field: CardCustomField) => {
    const fieldType: string = field.type || "select";
    switch (fieldType) {
      case EnumCustomFieldType.Checkbox:
        return <CheckSquare size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Text:
      case "string":
        return <StretchHorizontal size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Dropdown:
      case "user":
      case "select":
        return <List size={12} className="text-gray-500" />;
      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  const getFieldDisplayValue = (field: CardCustomField): string => {
    switch (field.type) {
      case EnumCustomFieldType.Checkbox: {
        const checked = normalizeCheckboxValue(field?.valueCheckbox, (field as any)?.value_checkbox);
        return checked ? "true" : "false";
      }
      case EnumCustomFieldType.Number: {
        if (field.valueNumber === 0) return "0";
        if (field.valueNumber) return String(field.valueNumber);
        return "";
      }
      case EnumCustomFieldType.Date: {
        if (field.valueDate) {
          const d = dayjs(field.valueDate);
          if (d.isValid()) return d.format("YYYY-MM-DD HH:mm");
        }
        return "";
      }
      default: {
        return (
          field.valueOption ||
          field.valueString ||
          (field as any)?.value_option ||
          (field as any)?.value_string ||
          (field.valueNumber ? String(field.valueNumber) : "") ||
          ""
        );
      }
    }
  };

  const copyFieldValue = async (field: CardCustomField) => {
    const text = getFieldDisplayValue(field);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      messageApi.success("Copied");
    } catch (err) {
      messageApi.error("Copy failed");
    }
  };

  if (isLoading) {
    return <div className="ml-8 text-gray-500">Loading custom fields...</div>;
  }

  if (!cardCustomFields || cardCustomFields.length === 0) {
    return null;
  }

  return (
    <div className="relative min-h-[200px]">
      {contextHolder}
      {isUpdating && (
        <div className="fixed inset-0 bg-white/60 z-[9999] flex items-center justify-center backdrop-blur-[1px]">
          <div className="bg-white p-3 rounded-full shadow-lg">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        </div>
      )}
      <div className="ml-0 md:ml-8 mb-4">
        <Input
          placeholder="Search custom fields..."
          prefix={<Search size={16} className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ml-0 md:ml-8">
        {filteredCustomFields.map((field) => {
          const canView = field.canView !== false;
          if (!canView) return null;

          return (
            <div key={field.id} className="space-y-2">
              <div className="w-full">
                <div className="flex items-center gap-2 text-gray-700 font-medium justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFieldIcon(field)}
                    <Tooltip title={field.name}>
                      <span className="truncate" style={{ fontSize: "14px" }}>
                        {field.name}
                      </span>
                    </Tooltip>
                  </div>
                  <Tooltip title="Copy value">
                    <button
                      type="button"
                      onClick={() => copyFieldValue(field)}
                      className="text-gray-500 hover:text-gray-800 transition-colors"
                      aria-label={`Copy ${field.name}`}
                    >
                      <Copy size={14} />
                    </button>
                  </Tooltip>
                </div>
                <div>{renderFieldInput(field)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomFields;
