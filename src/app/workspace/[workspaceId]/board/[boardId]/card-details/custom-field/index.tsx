import { SelectionRef, UserSelection } from "@/app/components/selection";
import { useCardCustomField } from "@/app/hooks/card_custom_field";
import { useCardDetailContext } from "@/app/provider/card-detail-context";
import { api } from "@/app/api";
import { Checkbox, Input, Select, message } from "antd";
import { List, StretchHorizontal, TextCursorInput } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLists } from "@/app/hooks/list";
import { useParams } from "next/navigation";
import { CustomField } from "@/app/types/type";

interface CustomFieldsProps {
  customFields: CustomField[];
}

const CustomFields: React.FC<CustomFieldsProps> = (props) => {
  const { customFields } = props;
  const { selectedCard } = useCardDetailContext();
  const { 
    cardCustomFields, 
    updateCustomField, 
    addCustomField,
    isUpdatingCustomField,
    isAddingCustomField 
  } = useCardCustomField(selectedCard?.id || '');
  
  const [messageApi, contextHolder] = message.useMessage();
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const params = useParams();
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId;
  const { lists } = useLists(boardId || '');
  
  
  // Create a map of refs for user selection fields
  const userSelectionRefs = useRef<Map<string, SelectionRef>>(new Map());

  // Initialize field values from props
  useEffect(() => {
    if (customFields) {
      const initialValues: Record<string, any> = {};
      
      customFields.forEach(field => {
        // Make sure cardCustomFields is an array before using find
        const customFieldsArray = Array.isArray(cardCustomFields) ? cardCustomFields : [];
        
        // Find matching custom field value
        const customFieldValue = customFieldsArray.find(cf => cf.id === field.id);
        
        if (customFieldValue) {
          initialValues[field.id] = customFieldValue.value;
        } else {
          initialValues[field.id] = null;
        }
      });
      
      setFieldValues(initialValues);
    }
  }, [customFields, cardCustomFields]);

  // Update loading states when mutations complete
  useEffect(() => {
    if (!isUpdatingCustomField && !isAddingCustomField) {
      setLoading({});
    }
  }, [isUpdatingCustomField, isAddingCustomField]);

  // Handle value changes for all field types
  const handleValueChange = (fieldId: string, value: any) => {
    if (!fieldId) {
      messageApi.error("Missing field ID");
      return;
    }
    
    if (!selectedCard?.id) {
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
    
    // Ensure value is a string (or appropriate type for the backend)
    const processedValue = value?.toString() || "";
    
    try {
      // Make sure cardCustomFields is an array before using find
      const customFieldsArray = Array.isArray(cardCustomFields) ? cardCustomFields : [];
      
      // Check if we have a field value already
      const existingValue = customFieldsArray.find(cf => cf.id === fieldId);
      
      // Use the existing axios-based API directly
      if (existingValue) {
        // Use PUT for existing fields
        api.put(`/card/${selectedCard.id}/custom-field/${fieldId}`, { value: processedValue })
          .then(response => {
            console.log("Direct API update succeeded:", response);
            messageApi.success("Field updated successfully");
            
            // Reset loading state
            setLoading(prev => ({
              ...prev,
              [fieldId]: false
            }));
          })
          .catch(error => {
            console.error("Direct API update failed:", error);
            messageApi.error("Failed to update field");
            
            // Reset loading state
            setLoading(prev => ({
              ...prev,
              [fieldId]: false
            }));
          });
      } else {
        // Use POST for new fields
        api.post(`/card/${selectedCard.id}/custom-field/${fieldId}`, { 
          value: processedValue,
          customFieldId: fieldId,
          cardId: selectedCard.id
        })
          .then(response => {
            console.log("Direct API create succeeded:", response);
            messageApi.success("Field created successfully");
            
            // Reset loading state
            setLoading(prev => ({
              ...prev,
              [fieldId]: false
            }));
          })
          .catch(error => {
            console.error("Direct API create failed:", error);
            messageApi.error("Failed to create field");
            
            // Reset loading state
            setLoading(prev => ({
              ...prev,
              [fieldId]: false
            }));
          });
      }
    } catch (error) {
      console.error("Error updating field:", error);
      messageApi.error("Failed to update field");
      
      // Reset loading state on error
      setLoading(prev => ({
        ...prev,
        [fieldId]: false
      }));
    }
  };

  // Group fields into rows of 3
  const getFieldRows = () => {
    const rows = [];
    for (let i = 0; i < customFields.length; i += 3) {
      rows.push(customFields.slice(i, i + 3));
    }
    return rows;
  };

  // Render appropriate input based on field type
  const renderFieldInput = (field: CustomField) => {
    const fieldType: string = field.type || 'select';
    const fieldValue = fieldValues[field.id];
    const isFieldLoading = loading[field.id] || false;

    switch (fieldType) {
      case 'checkbox':
        return (
          <Checkbox 
            checked={Boolean(fieldValue)}
            onChange={(e) => handleValueChange(field.id, e.target.checked)}
            disabled={isFieldLoading}
          />
        );
      case 'string':
        return (
          <Input
            placeholder={`Add ${field.name}...`}
            className="w-full"
            value={fieldValue as string || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            disabled={isFieldLoading}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={`Add ${field.name}...`}
            className="w-full"
            value={fieldValue as number || ''}
            onChange={(e) => handleValueChange(field.id, Number(e.target.value))}
            disabled={isFieldLoading}
          />
        );
      case 'select':
      default:
        if (field.source === "user") {
          return (
            <UserSelection 
              ref={(ref) => {
                if (ref) userSelectionRefs.current.set(field.id, ref);
              }}
              value={fieldValue}
              onChange={(value) => handleValueChange(field.id, value)}
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
              value={fieldValue as string || undefined}
              onChange={(value) => handleValueChange(field.id, value)}
              options={[]}
              disabled={isFieldLoading}
            />
          );
        }   
    }
  };

  // Get icon based on field type
  const getFieldIcon = (field: CustomField) => {
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
  const isCheckboxField = (field: CustomField) => {
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
                <div key={field.id} className="space-y-2">
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
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

export default CustomFields;