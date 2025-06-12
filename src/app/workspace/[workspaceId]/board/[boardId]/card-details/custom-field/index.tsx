import { SelectionRef, UserSelection } from "@components/selection";
import { useCardCustomField } from "@hooks/card_custom_field";
import { useCardDetailContext } from "@providers/card-detail-context";
import { Checkbox, DatePicker, Input, Select, message } from "antd";
import { List, StretchHorizontal, TextCursorInput } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLists } from "@hooks/list";
import { useParams } from "next/navigation";
import api from "@api/index";
import { CustomField, EnumCustomFieldSource, EnumCustomFieldType } from "@myTypes/custom-field";
import { Card, CardCustomField, EnumAttachmentType, EnumCardType } from "@myTypes/card";
import dayjs, { Dayjs } from "dayjs";
import { setCardCustomFieldValue } from "@api/card_custom_field";

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
    if (e.key === 'Enter') {
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
    reset
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
}> = ({ placeholder, initialValue, onSave, className, type = "text", fieldName }) => {

  const {
    value,
    hasChanges,
    onChange,
    onKeyPress,
    onBlur
  } = useEnterToSave(
    initialValue,
    onSave,
    { saveOnBlur: true }
  );

  return (
    <div className="relative">
      <Input
        type={type}
        placeholder={placeholder}
        className={`${className} ${hasChanges ? 'border-blue-400' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        onBlur={onBlur}
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
}> = ({ placeholder, initialValue, onSave, className, fieldName }) => {
  
  const {
    value,
    hasChanges,
    onChange,
    onKeyPress,
    onBlur
  } = useEnterToSave(
    initialValue?.toString() || "",
    (stringValue) => {
      const numValue = parseFloat(stringValue);
      if (!isNaN(numValue)) {
        onSave(numValue);
      }
    },
    { saveOnBlur: true }
  );

  return (
    <div className="relative">
      <Input
        type="number"
        placeholder={placeholder}
        className={`${className} ${hasChanges ? 'border-blue-400' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        onBlur={onBlur}
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
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
  const { 
    cardCustomFields,
    setStringValue,
    setNumberValue,
    setCheckboxValue,
    setDateValue,
    setOptionValue,
    setUserValue,
    isUpdating,
    isLoading
  } = useCardCustomField(card?.id || '', workspaceId);
  
  const [messageApi, contextHolder] = message.useMessage();
  
  const { lists } = useLists(boardId || '');
  
  // Create a map of refs for user selection fields
  const userSelectionRefs = useRef<Map<string, SelectionRef>>(new Map());

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

  // Group fields into rows of 3
  const getFieldRows = () => {
    const rows = [];
    for (let i = 0; i < cardCustomFields.length; i += 3) {
      rows.push(cardCustomFields.slice(i, i + 3));
    }
    return rows;
  };

  // Render appropriate input based on field type
  const renderFieldInput = (field: CardCustomField) => {
    if (!field.id) return null;

    switch (field?.type) {
      case EnumCustomFieldType.Checkbox:
        return (
          <Checkbox 
            checked={Boolean(field?.valueCheckbox)}
            onChange={(e) => handleCheckboxValueChange(field.id!, e.target.checked)}
          />
        );
      
      case EnumCustomFieldType.Text:
        return (
          <EnterToSaveInput
            fieldName={field.name}
            placeholder={`Add ${field.name}...`}
            className="w-full"
            initialValue={field.valueString || ""}
            onSave={(value) => handleStringValueChange(field.id!, value)}
          />
        );
      
      case EnumCustomFieldType.Number:
        return (
          <EnterToSaveNumberInput
            fieldName={field.name}
            placeholder={`Add ${field.name}...`}
            className="w-full"
            initialValue={field.valueNumber}
            onSave={(value) => handleNumberValueChange(field.id!, value)}
          />
        );
      
      case EnumCustomFieldType.Date:
        const dateValue = field.valueDate ? dayjs(field.valueDate) : null;
        return (
          <DatePicker
            className="w-full"
            placeholder={`Select ${field.name}...`}
            value={dateValue}
            onChange={(date: Dayjs | null) => {
              const dateValue = date ? date.toDate() : null;
              handleDateValueChange(field.id!, dateValue);
            }}
            format="YYYY-MM-DD"
            allowClear
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
              onChange={(value: string) => value && handleUserValueChange(field.id!, value)}
              placeholder={`Select ${field.name}...`}
              size="middle"
              className="w-full"
            />
          );
        } else {
          return (
            <div>
              <Select
                className="w-full"
                placeholder={`Select ${field.name}...`}
                value={field.valueOption as string || undefined}
                onChange={(value) => value && handleOptionValueChange(field.id!, value)}
                options={field?.options}
              />
            </div>
          );
        }
      
      default:
        return (
          <div className="text-red-500 text-sm">
            Unknown field type: {field.type}
          </div>
        );
    }
  };

  // Get icon based on field type
  const getFieldIcon = (field: CardCustomField) => {
    const fieldType: string = field.type || 'select';
    switch (fieldType) {
      case EnumCustomFieldType.Text:
      case 'string':
        return <StretchHorizontal size={12} className="text-gray-500" />;
      case EnumCustomFieldType.Dropdown:
      case 'user':
      case 'select':
        return <List size={12} className="text-gray-500" />;
      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  // Check if field is a checkbox type
  const isCheckboxField = (field: CardCustomField) => {
    return field.type === EnumCustomFieldType.Checkbox;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <TextCursorInput size={18} />
          <h1 className="text-lg font-bold mb-0">Custom Fields</h1>
        </div>
        <div className="ml-8 text-gray-500">Loading custom fields...</div>
      </div>
    );
  }

  // Show message if no fields
  if (!cardCustomFields || cardCustomFields.length === 0) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <TextCursorInput size={18} />
          <h1 className="text-lg font-bold mb-0">Custom Fields</h1>
        </div>
        <div className="ml-8 text-gray-500">No custom fields available</div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <TextCursorInput size={18} />
          <h1 className="text-lg font-bold mb-0">Custom Fields</h1>
          {isUpdating && (
            <span className="text-sm text-blue-500 ml-2">Saving...</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 ml-8">
          {getFieldRows().map((row, rowIndex) => ( 
            <Fragment key={`row-${rowIndex}`}>
              {row.map(field => (
                <div key={field.id} className="space-y-2 flex items-center">
                  <div className="w-full">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      {isCheckboxField(field) ? (
                        renderFieldInput(field)
                      ) : (
                        getFieldIcon(field)
                      )}
                      <span>{field.name}</span>
                    </div>
                    
                    {!isCheckboxField(field) && (
                      <div>{renderFieldInput(field)}</div>
                    )}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

export default CustomFields;