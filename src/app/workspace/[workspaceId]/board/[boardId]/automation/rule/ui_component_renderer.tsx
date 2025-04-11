import React from 'react';
import { Input, Select, InputNumber } from 'antd';
import { 
  ComponentDefinition, ComponentTypeId,
  availableLists, availableBoards, availableLabels, availableUsers
} from '@/app/dto/rules';

interface UIComponentRendererProps {
  component: ComponentDefinition;
  value?: any;
  onChange?: (value: any) => void;
  isEditing?: boolean;
}

const UIComponentRenderer: React.FC<UIComponentRendererProps> = ({ 
  component, 
  value, 
  onChange,
  isEditing = false
}) => {
  // Helper for rendering different component types
  switch (component.type) {
    case ComponentTypeId.TEXT:
      return <span className="mr-1">{component.text}</span>;
      
    case ComponentTypeId.SELECT:
      if (!isEditing || !onChange) {
        return <span className="bg-white px-2 py-1 rounded mr-1">{value || component.placeholder}</span>;
      }
      return (
        <Select
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          style={{ width: 150 }}
        >
          {component.options?.map(option => (
            <Select.Option key={option.id} value={option.id}>
              {option.name}
            </Select.Option>
          ))}
        </Select>
      );
      
    case ComponentTypeId.INPUT:
      if (!isEditing || !onChange) {
        return <span className="bg-white px-2 py-1 rounded mr-1">{value || component.placeholder}</span>;
      }
      return (
        <Input
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: 150 }}
        />
      );
      
    case ComponentTypeId.NUMBER_INPUT:
      if (!isEditing || !onChange) {
        return <span className="bg-white px-2 py-1 rounded mr-1">{value || component.defaultValue || component.placeholder}</span>;
      }
      return (
        <InputNumber
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          min={0}
          style={{ width: 80 }}
        />
      );
      
    case ComponentTypeId.USER_SELECT:
      if (!isEditing || !onChange) {
        if (!value) {
          return <span className="bg-white px-2 py-1 rounded mr-1">{component.placeholder}</span>;
        }
        const user = availableUsers.find(u => u.id === value);
        return <span className="bg-white px-2 py-1 rounded mr-1">{user?.name || value}</span>;
      }
      return (
        <Select
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          style={{ width: 150 }}
        >
          {availableUsers.map(user => (
            <Select.Option key={user.id} value={user.id}>
              {user.name}
            </Select.Option>
          ))}
        </Select>
      );
      
    case ComponentTypeId.BOARD_SELECT:
      if (!isEditing || !onChange) {
        if (!value) {
          return <span className="bg-white px-2 py-1 rounded mr-1">{component.placeholder}</span>;
        }
        const board = availableBoards.find(b => b.id === value);
        return <span className="bg-white px-2 py-1 rounded mr-1">{board?.name || value}</span>;
      }
      return (
        <Select
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          style={{ width: 220 }}
        >
          {availableBoards.map(board => (
            <Select.Option key={board.id} value={board.id}>
              {board.name}
            </Select.Option>
          ))}
        </Select>
      );
      
    case ComponentTypeId.LIST_SELECT:
      if (!isEditing || !onChange) {
        if (!value) {
          return <span className="bg-white px-2 py-1 rounded mr-1">{component.placeholder}</span>;
        }
        const list = availableLists.find(l => l.id === value);
        return <span className="bg-white px-2 py-1 rounded mr-1">{list?.name || value}</span>;
      }
      return (
        <Select
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          style={{ width: 220 }}
        >
          {availableLists.map(list => (
            <Select.Option key={list.id} value={list.id}>
              {list.name}
            </Select.Option>
          ))}
        </Select>
      );
      
    case ComponentTypeId.LABEL_SELECT:
      if (!isEditing || !onChange) {
        if (!value && component.text) {
          return <span className="bg-light-green-100 text-light-green-800 px-2 py-1 rounded mr-1">{component.text}</span>;
        }
        if (!value) {
          return <span className="bg-white px-2 py-1 rounded mr-1">{component.placeholder}</span>;
        }
        const label = availableLabels.find(l => l.id === value);
        return (
          <span className={`bg-${label?.color || 'gray'}-100 text-${label?.color || 'gray'}-800 px-2 py-1 rounded mr-1`}>
            {label?.name || value}
          </span>
        );
      }
      return (
        <Select
          className="mr-1"
          placeholder={component.placeholder}
          value={value}
          onChange={onChange}
          style={{ width: 150 }}
        >
          {availableLabels.map(label => (
            <Select.Option key={label.id} value={label.id}>
              <span className={`bg-${label.color}-100 text-${label.color}-800 px-1 rounded`}>{label.name}</span>
            </Select.Option>
          ))}
        </Select>
      );
      
    default:
      return null;
  }
};

export default UIComponentRenderer;