import React, { useState } from 'react';
import { Button, Input, Popover, Spin, List, Typography, Divider, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSplitJobTemplates } from '@hooks/split_job';
import { SplitJobTemplate } from '@api/split_job';

const { Title, Text } = Typography;

interface SplitJobPopoverProps {
  workspaceId: string;
  customFieldId: string;
  cardId: string;
  children: React.ReactElement;
  onTemplateSelect: (template: SplitJobTemplate) => void;
}

const SplitJobPopover: React.FC<SplitJobPopoverProps> = ({
  workspaceId,
  customFieldId,
  cardId,
  children,
  onTemplateSelect
}) => {
  const [open, setOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const { 
    templates, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    createTemplate,
    isCreating,
    deleteTemplate,
    isDeleting 
  } = useSplitJobTemplates(workspaceId, customFieldId);
  
  const [messageApi, contextHolder] = message.useMessage();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      refetch();
    }
  };

  const handleCreateTemplate = async () => {
    if (!customFieldId) {
      return;
    }
    
    if (newTemplateName.trim()) {
      try {
        const newTemplate = await createTemplate(newTemplateName.trim());
        if (newTemplate) {
          setNewTemplateName('');
          messageApi.success(`Template "${newTemplateName.trim()}" created`);
        }
      } catch (error) {
        messageApi.error('Failed to create template');
        console.error(error);
      }
    }
  };
  
  const handleDeleteTemplate = async (templateId: string, templateName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the list item click
    
    try {
      await deleteTemplate(templateId);
      messageApi.success(`Template "${templateName}" deleted`);
    } catch (error) {
      messageApi.error('Failed to delete template');
      console.error(error);
    }
  };
  
  const isCustomFieldIdMissing = !customFieldId;

  const content = (
    <div className="w-64">
      <Title level={5}>Split Job Templates</Title>
      {isError && <Text type="danger">{String(error)}</Text>}
      
      <div className="mb-3">
        {isCustomFieldIdMissing && (
          <div className="text-amber-500 text-xs mb-1">
            Custom field ID is required to create templates
          </div>
        )}
        <Input
          placeholder="New template name"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          onPressEnter={handleCreateTemplate}
          disabled={isCustomFieldIdMissing}
          suffix={
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleCreateTemplate}
              size="small"
              disabled={isCustomFieldIdMissing}
            />
          }
        />
      </div>
      
      <Divider className="my-2" />
      
      {isLoading || isCreating ? (
        <div className="flex justify-center py-4">
          <Spin />
        </div>
      ) : (
        <List
          size="small"
          dataSource={templates}
          renderItem={(template) => (
            <List.Item 
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => {
                onTemplateSelect(template);
                setOpen(false);
              }}
              actions={[
                <Button
                  key="delete"
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={(e) => handleDeleteTemplate(template.id, template.name, e)}
                  loading={isDeleting}
                />
              ]}
            >
              <Text>{template.name}</Text>
            </List.Item>
          )}
          locale={{ emptyText: 'No templates found' }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Split Jobs"
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottom"
    >
      {contextHolder}
      {children}
    </Popover>
  );
};

export default SplitJobPopover;
