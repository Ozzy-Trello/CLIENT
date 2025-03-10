import React from 'react';
import { Checkbox, Input } from 'antd';
import { ChevronDown } from 'lucide-react';
import { CustomField } from '@/app/dto/types';

// Type definitions
interface CustomFieldsSectionProps {
  customFields: CustomField[];
}

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({ customFields }) => {
  // Map of fields that should appear in the UI with their default values
  const fieldDefaults: Record<string, string | boolean> = {
    'Priority': 'Select...',
    'Cabang': 'WBT',
    'Deal Maker': 'Ramli Ramadhan',
    'Desain Langsung': 'Select...',
    'Produk': 'Custom Polo',
    'Varian': 'Polos',
    'Jenis Cetak': 'Bordir',
    'Bahan': 'Lacost CVC 20s',
    'Warna': 'deskrip',
    'Desainer': 'Tyo',
    'Revisi Desain': false,
    'Terkirim ke DM': true,
    'Desain ACC': true
  };

  // Create a map of field values from the provided customFields
  const fieldValues: Record<string, string | boolean> = {};
  customFields.forEach(field => {
    fieldValues[field.name] = field.value?.displayValue || fieldDefaults[field.name] || 'Select...';
  });

  // Combine default fields with actual values
  const mergedFields = Object.keys(fieldDefaults).map(fieldName => ({
    name: fieldName,
    value: fieldValues[fieldName] !== undefined ? fieldValues[fieldName] : fieldDefaults[fieldName]
  }));

  // Get the icon component for a field
  const getIconComponent = (fieldName: string): JSX.Element => {
    const isCheckboxField = ['Revisi Desain', 'Terkirim ke DM', 'Desain ACC'].includes(fieldName);
    
    if (isCheckboxField) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    if (fieldName === 'Warna') {
      return (
        <span className="font-semibold text-sm">T</span>
      );
    }
    
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  };

  // Render each custom field
  const renderField = (field: { name: string; value: string | boolean }) => {
    const isCheckboxField = ['Revisi Desain', 'Terkirim ke DM', 'Desain ACC'].includes(field.name);
    const isInputField = field.name === 'Warna';
    const isProdukField = field.name === 'Produk';

    return (
      <div key={field.name} className="mb-6 text-sm">
        <div className="flex items-center text-gray-600 mb-1">
          <span className="mr-2">{getIconComponent(field.name)}</span>
          <span className="text-sm font-medium">{field.name}</span>
        </div>
        
        {isCheckboxField ? (
          <div className="pl-6">
            {field.value === true ? (
              <div className="bg-blue-500 text-white w-6 h-6 flex items-center justify-center rounded text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L19 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ) : (
              <div className="border border-gray-300 w-6 h-6 rounded"></div>
            )}
          </div>
        ) : isInputField ? (
          <Input
            value={field.value as string} 
            className="w-full bg-gray-100 rounded p-2 border-0 text-sm"
            readOnly
            size='small'
          />
        ) : (
          <div className={`flex justify-between items-center rounded p-2 text-sm ${
            isProdukField ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <span className={`text-sm ${isProdukField ? 'text-red-800' : ''}`}>
              {field.value as string}
            </span>
            <ChevronDown size={16} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-6 rounded-md">
      <div className="flex items-center mb-6">
        <svg className="w-5 h-5 mr-2 text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <h2 className="text-base font-medium text-gray-800">Custom Fields</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 text-sm">
        {mergedFields.map(renderField)}
      </div>
    </div>
  );
};

export default CustomFieldsSection;