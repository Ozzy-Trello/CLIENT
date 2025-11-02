import { SelectionRef, UserSelection } from "@components/selection";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";
import { Checkbox, DatePicker, Input, Select, Tooltip, message } from "antd";
import {
  List,
  StretchHorizontal,
  TextCursorInput,
  CheckSquare,
  Search,
} from "lucide-react";
import SplitJobSlider from "@components/split-job/SplitJobSlider";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLists } from "@hooks/list";
import { useParams } from "next/navigation";
import api from "@api/index";
import {
  CustomField,
  EnumCustomFieldSource,
  EnumCustomFieldType,
} from "@myTypes/custom-field";
import {
  Card,
  CardCustomField,
  EnumAttachmentType,
  EnumCardType,
} from "@myTypes/card";
import dayjs, { Dayjs } from "dayjs";
import { setCardCustomFieldValue } from "@api/card_custom_field";

// Note: Real-time updates are handled by the parent board component via useRealtimeUpdates()
// This component automatically receives updates through React Query invalidation

interface CustomFieldsProps {
  card: Card | null;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

// Custom hook for Enter-to-save functionality
function useEnterToSave<T>(
  initialValue: T,
  onSave: (value: T) => void,
  options?: {
    saveOnBlur?: boolean;
  }
) {
  const [localValue, setLocalValue] = useState<T>(initialValue);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local value when initial value changes externally
  useEffect(() => {
    setLocalValue(initialValue);
    setHasChanges(false);
  }, [initialValue]);

  const handleChange = (value: T) => {
    setLocalValue(value);
    setHasChanges(value !== initialValue);
  };

  const save = () => {
    if (hasChanges) {
      onSave(localValue);
      setHasChanges(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const handleBlur = () => {
    if (options?.saveOnBlur) {
      save();
    }
  };

  const reset = () => {
    setLocalValue(initialValue);
    setHasChanges(false);
  };

  return {
    value: localValue,
    hasChanges,
    onChange: handleChange,
    onKeyPress: handleKeyPress,
    onBlur: handleBlur,
    save,
    reset,
  };
}

// Enter-to-save Input component
const EnterToSaveInput: React.FC<{
  placeholder?: string;
  initialValue: string;
  onSave: (value: string) => void;
  className?: string;
  type?: string;
  fieldName?: string; // For debugging
  disabled?: boolean;
}> = ({
  placeholder,
  initialValue,
  onSave,
  className,
  type = "text",
  fieldName,
  disabled = false,
}) => {
  const { value, hasChanges, onChange, onKeyPress, onBlur } = useEnterToSave(
    initialValue,
    onSave,
    { saveOnBlur: true }
  );

  return (
    <div className="relative">
      <Input
        type={type}
        placeholder={placeholder}
        className={`${className} ${hasChanges ? "border-blue-400" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        onBlur={onBlur}
        disabled={disabled}
      />
      {hasChanges && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <span className="text-xs text-blue-500 bg-white px-1">↵</span>
        </div>
      )}
    </div>
  );
};

// Enter-to-save Number Input component
const EnterToSaveNumberInput: React.FC<{
  placeholder?: string;
  initialValue: number | undefined | null;
  onSave: (value: number) => void;
  className?: string;
  fieldName?: string; // For debugging
  customFieldId?: string; // Added for split job integration
  disabled?: boolean;
}> = ({
  placeholder,
  initialValue,
  onSave,
  className,
  fieldName,
  customFieldId,
  disabled = false,
}) => {
  const params = useParams();
  const { selectedCard } = useCardDetailContext();
  const cardId = selectedCard?.id || "";
  const { value, hasChanges, onChange, onKeyPress, onBlur } = useEnterToSave(
    initialValue?.toString() || "",
    (stringValue) => {
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        onSave(numValue);
      }
    },
    { saveOnBlur: true }
  );

  // Only show Split Job button for "Jml Produksi" field
  const showSplitJob = fieldName === "Jml Produksi";

  // Handle key down to prevent invalid characters
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ];
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
    if (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
      return;
    }
    
    // Allow allowed keys
    if (allowedKeys.includes(e.key)) {
      return;
    }
    
    // Allow numbers (0-9)
    if (e.key >= '0' && e.key <= '9') {
      return;
    }
    
    // Allow decimal point, but only one
    if (e.key === '.' && !value.includes('.')) {
      return;
    }
    
    // Allow minus sign only at the beginning
    if (e.key === '-' && value.length === 0) {
      return;
    }
    
    // Prevent all other keys (including 'e', 'E', '+')
    e.preventDefault();
  };

  // Handle paste to filter out invalid characters
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Remove all non-numeric characters except decimal point and minus sign
    const cleanedText = pastedText.replace(/[^0-9.-]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanedText.split('.');
    const finalText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanedText;
    
    // Ensure minus sign is only at the beginning
    const minusCount = (finalText.match(/-/g) || []).length;
    if (minusCount > 1 || (finalText.includes('-') && !finalText.startsWith('-'))) {
      const withoutMinus = finalText.replace(/-/g, '');
      onChange(finalText.startsWith('-') ? '-' + withoutMinus : withoutMinus);
    } else {
      onChange(finalText);
    }
  };

  return (
    <div className="relative">
      <Input
        type="text" // Changed from "number" to "text" for better control
        placeholder={placeholder}
        className={`${className} ${hasChanges ? "border-blue-400" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
        disabled={disabled}
        suffix={
          showSplitJob ? (
            <SplitJobSlider
              workspaceId={params.workspaceId as string}
              customFieldId={customFieldId || ""}
              cardId={cardId}
              value={parseFloat(value) || 0}
              onChange={(val) => {
                onChange(val.toString());
                onBlur();
              }}
            />
          ) : undefined
        }
      />
      {hasChanges && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <span className="text-xs text-blue-500 bg-white px-1">↵</span>
        </div>
      )}
    </div>
  );
};

const CustomFields: React.FC<CustomFieldsProps> = (props) => {
  const { card, setCard } = props;
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
    setUserValue,
    isUpdating,
    isLoading,
  } = useCardCustomField(card?.id || "", workspaceId);

  // Get board-level permissions
  const { canManageCardCustomFields, canUpdateCard } =
    useBoardPermissionsContext();

  const [messageApi, contextHolder] = message.useMessage();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { lists } = useLists(boardId || "");

  // Create a map of refs for user selection fields
  const userSelectionRefs = useRef<Map<string, SelectionRef>>(new Map());

  // Filter custom fields based on search term
  const filteredCustomFields =
    cardCustomFields?.filter((field) => {
      if (!searchTerm) return true;
      return field.name?.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];

  // Handle value changes for different field types
  const handleStringValueChange = (fieldId: string, value: string) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    setStringValue(fieldId, value);
  };

  const handleNumberValueChange = (fieldId: string, value: number) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    setNumberValue(fieldId, value);
  };

  const handleCheckboxValueChange = (fieldId: string, value: boolean) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    setCheckboxValue(fieldId, value);
  };

  const handleDateValueChange = (fieldId: string, value: Date | null) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    if (value) {
      setDateValue(fieldId, value);
    }
  };

  const handleOptionValueChange = (fieldId: string, value: string) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    setOptionValue(fieldId, value);
  };

  const handleUserValueChange = (fieldId: string, value: string) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    setUserValue(fieldId, value);
  };

  // Helper function to parse role-based source
  const parseRoleSource = (source: string): string[] => {
    if (source?.startsWith("user-role:")) {
      return source
        .slice(10)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Group fields into rows of 3
  const getFieldRows = () => {
    const rows = [];
    for (let i = 0; i < filteredCustomFields.length; i += 3) {
      rows.push(filteredCustomFields.slice(i, i + 3));
    }
    return rows;
  };

  // Render appropriate input based on field type
  const renderFieldInput = (field: CardCustomField) => {
    if (!field.id) return null;

    // Check if user can view and edit this field
    // Combine board-level permissions with field-level permissions
    // If canView/canEdit is undefined, it means the backend didn't send the permission info
    // In that case, we should default to allowing access (for backward compatibility)
    const canView = field.canView !== undefined ? field.canView : true;
    const fieldCanEdit = field.canEdit !== undefined ? field.canEdit : true;
    const canEdit =
      canUpdateCard() && canManageCardCustomFields() && fieldCanEdit;

    // If user can't view this field, don't render it
    if (!canView) {
      return null;
    }

    switch (field?.type) {
      case EnumCustomFieldType.Checkbox:
        return (
          <div className="w-full">
            <Checkbox
              checked={Boolean(field?.valueCheckbox)}
              onChange={(e) =>
                canEdit
                  ? handleCheckboxValueChange(field.id!, e.target.checked)
                  : undefined
              }
              disabled={!canEdit}
            />
          </div>
        );

      case EnumCustomFieldType.Text:
        return (
          <EnterToSaveInput
            fieldName={field.name}
            placeholder={`Add ${field.name}...`}
            className={`w-full ${
              !canEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            initialValue={field.valueString || ""}
            onSave={(value) =>
              canEdit ? handleStringValueChange(field.id!, value) : undefined
            }
            disabled={!canEdit}
          />
        );

      case EnumCustomFieldType.Number:
        return (
          <EnterToSaveNumberInput
            fieldName={field.name}
            placeholder={`Add ${field.name}...`}
            className={`w-full ${
              !canEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            initialValue={field.valueNumber}
            customFieldId={field.id}
            onSave={(value) =>
              canEdit ? handleNumberValueChange(field.id!, value) : undefined
            }
            disabled={!canEdit}
          />
        );

      case EnumCustomFieldType.Date:
        const dateValue = field.valueDate ? dayjs(field.valueDate) : null;
        return (
          <DatePicker
            className={`w-full ${
              !canEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            placeholder={`Select ${field.name}...`}
            value={dateValue}
            onChange={(date: Dayjs | null) => {
              if (canEdit) {
                const dateValue = date ? date.toDate() : null;
                handleDateValueChange(field.id!, dateValue);
              }
            }}
            format="YYYY-MM-DD HH:mm"
            showTime={{ format: "HH:mm" }}
            allowClear
            disabled={!canEdit}
          />
        );

      case EnumCustomFieldType.Dropdown:
        // Handle different source types for dropdown
        if (field.source === EnumCustomFieldSource.User) {
          // Standard user selection (all users)
          return (
            <UserSelection
              ref={(ref) => {
                if (ref && field.id)
                  userSelectionRefs.current.set(field.id, ref);
              }}
              value={field.valueUserId}
              onChange={(value: string) =>
                canEdit && value
                  ? handleUserValueChange(field.id!, value)
                  : undefined
              }
              placeholder={`Select ${field.name}...`}
              size="middle"
              disabled={!canEdit}
            />
          );
        } else if (field.source?.startsWith("user-role:")) {
          // Role-based user selection
          const roleIds = parseRoleSource(field.source);
          return (
            <UserSelection
              ref={(ref) => {
                if (ref && field.id)
                  userSelectionRefs.current.set(field.id, ref);
              }}
              value={field.valueUserId}
              onChange={(value: string) =>
                canEdit && value
                  ? handleUserValueChange(field.id!, value)
                  : undefined
              }
              placeholder={`Select ${field.name}...`}
              size="middle"
              className={`w-full ${
                !canEdit ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              roleIds={roleIds} // Pass role IDs for filtering
              disabled={!canEdit}
            />
          );
        } else {
          // Custom dropdown options
          return (
            <div>
              <Select
                className={`w-full ${
                  !canEdit ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                placeholder={`Select ${field.name}...`}
                value={(field.valueOption as string) || undefined}
                onChange={(value) =>
                  canEdit && value
                    ? handleOptionValueChange(field.id!, value)
                    : undefined
                }
                options={field?.options}
                disabled={!canEdit}
              />
            </div>
          );
        }

      case EnumCustomFieldType.Checkbox:
        return <CheckSquare size={12} className="text-gray-500" />;

      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  // Get icon based on field type
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

  // Show loading state
  if (isLoading) {
    return <div className="ml-8 text-gray-500">Loading custom fields...</div>;
  }

  // Don't render if no fields
  if (!cardCustomFields || cardCustomFields.length === 0) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div>
        {isUpdating && (
          <div className="mb-2 text-sm text-blue-500">Saving...</div>
        )}
        {/* Search Bar */}
        <div className="ml-8 mb-4">
          <Input
            placeholder="Search custom fields..."
            prefix={<Search size={16} className="text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="max-w-md"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 ml-8">
          {getFieldRows().map((row, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              {row.map((field) => {
                // Use the permission flags directly (backend already handles public fields)
                const canView = field.canView !== false;
                const canEdit =
                  canUpdateCard() &&
                  canManageCardCustomFields() &&
                  field.canEdit !== false;

                // Hide fields that user can't view
                if (!canView) {
                  return null;
                }

                return (
                  <div key={field.id} className="space-y-2">
                    <div className="w-full">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        {getFieldIcon(field)}
                        <Tooltip title={field.name}>
                          <span
                            className="truncate"
                            style={{ fontSize: "14px" }}
                          >
                            {field.name}
                          </span>
                        </Tooltip>
                      </div>

                      <div>{renderFieldInput(field)}</div>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

export default CustomFields;
