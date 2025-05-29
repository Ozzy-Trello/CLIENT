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

interface CustomFieldsProps {
  card: Card | null;
  setCard: React.Dispatch<React.SetStateAction<Card | null>>;
}

const CustomFields: React.FC<CustomFieldsProps> = (props) => {
  const { card, setCard } = props;
  const params = useParams();
  const workspaceId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
  const { cardCustomFields, } = useCardCustomField(card?.id || '', workspaceId);
  
  const [messageApi, contextHolder] = message.useMessage();
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  const { lists } = useLists(boardId || '');
  
  
  // Create a map of refs for user selection fields
  const userSelectionRefs = useRef<Map<string, SelectionRef>>(new Map());


  // Handle value changes for all field types
  const handleValueChange = (fieldId: string, value: any) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    
    if (!card?.id) {
      messageApi.error("Missing card ID");
      return;
    }
    
    // Update local state first
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Set this field as loading
    setLoading(prev => ({
      ...prev,
      [fieldId]: true
    }));
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

    switch (field?.type) {
      case EnumCustomFieldType.Checkbox:
        return (
          <Checkbox 
            checked={Boolean(field?.value_checkbox)}
            onChange={(e) => field.id && handleValueChange(field.id, e.target.checked)}
          />
        );
      case EnumCustomFieldType.Text:
        return (
          <Input
            placeholder={`Add ${field.name}...`}
            className="w-full"
            value={field.value_string}
            onChange={(e) => field.id && handleValueChange(field.id, e.target.value)}
          />
        );
      case EnumCustomFieldType.Number:
        return (
          <Input
            type="number"
            placeholder={`Add ${field.name}...`}
            className="w-full"
            value={field.value_number}
            onChange={(e) => field.id && handleValueChange(field.id, Number(e.target.value))}
          />
        );
      case EnumCustomFieldType.Date:
        return (
          <DatePicker
            className="w-full"
            placeholder={`Select ${field.name}...`}
            value={field.value_date ? dayjs(field.value_date) : null}
            onChange={(date: Dayjs | null) => {
              if (field.id) {
                // Convert dayjs to Date object or null
                const dateValue = date ? date.toDate() : null;
                handleValueChange(field.id, dateValue);
              }
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
              value={field.value_user_id}
              onChange={(value) => value && field.id && handleValueChange(field.id, value)}
              placeholder={`Select ${field.name}...`}
              size="middle"
              className="w-full"
            />
          );
        } else {
          return (
            <Select
              className="w-full"
              placeholder={`Select ${field.name}...`}
              value={field.value_option as string || undefined}
              onChange={(value) => value && field.id && handleValueChange(field.id, value)}
              options={field?.options}
            />
          );
        }   
      default:
       
    }
  };

  // Get icon based on field type
  const getFieldIcon = (field: CardCustomField) => {
    const fieldType: string = field.type || 'select';
    switch (fieldType) {
      case 'string':
        return <StretchHorizontal size={12} className="text-gray-500" />;
      case 'user':
      case 'select':
        return <List size={12} className="text-gray-500" />;
      default:
        return <StretchHorizontal size={12} className="text-gray-500" />;
    }
  };

  // Check if field is a checkbox type
  const isCheckboxField = (field: CardCustomField) => {
    return field.type === 'checkbox';
  };

  return (
    <>
      {contextHolder}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-2">
          <TextCursorInput size={18} />
          <h1 className="text-lg font-bold mb-0">Custom Fields</h1>
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