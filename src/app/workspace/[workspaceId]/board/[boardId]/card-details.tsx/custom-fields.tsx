import { CustomField } from "@/app/dto/types";
import { Checkbox, Input, Select, Typography } from "antd";
import { List, ListTodo, TextCursorInput } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

interface CustomFieldsProps {
  customFields: CustomField[];
}
const CustomFields: React.FC<CustomFieldsProps> = (props) => {

  const {customFields} = props;
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Initialize field values from props
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    customFields.forEach(field => {
      initialValues[field.id] = field.value ?? null;
    });
    setFieldValues(initialValues);
  }, [customFields]);

  const handleValueChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
    // onFieldChange(fieldId, value);
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

    switch (fieldType) {
      case 'checkbox':
        return (
          <Checkbox 
            checked={Boolean(fieldValue)}
            onChange={(e) => handleValueChange(field.id, e.target.checked)}
          />
        );
      case 'string':
        return (
          <Input
            placeholder={`Add ${field.name}...`}
            className="w-full"
            value={fieldValue as string || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
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
          />
        );
      case 'select':
      default:
        return (
          <Select
            className="w-full"
            placeholder="Select..."
            value={fieldValue as string || undefined}
            onChange={(value) => handleValueChange(field.id, value)}
            options={ []}
            suffixIcon={<span className="text-gray-400">▼</span>}
          />
        );
    }
  };

  // Get icon based on field type
  const getFieldIcon = (field: CustomField) => {
    const fieldType: string = field.type || 'select';
    switch (fieldType) {
      case 'string':
        return <ListTodo size={14} className="text-gray-500" />;
      default:
        return <ListTodo size={14} className="text-gray-500" />;
    }
  };

  // Check if field is a checkbox type
  const isCheckboxField = (field: CustomField) => {
    return field.type === 'checkbox';
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-2">
        <TextCursorInput size={18} />
        <h1 className="text-5xl font-bold mb-0">Custom Fields</h1>
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
  );
}

export default CustomFields;