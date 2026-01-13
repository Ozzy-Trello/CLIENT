import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  Input,
  InputNumber,
  List,
  message,
  Popover,
  Spin,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSplitJobTemplates, useSplitJobValues } from "@hooks/split_job";

const { Title, Text } = Typography;

interface SplitJobPopoverProps {
  workspaceId: string;
  customFieldId: string;
  cardId: string;
  jmlTotal: number;
  onSuccess?: () => void;
  children: React.ReactElement;
}

const normalizeNumberValue = (value?: number | null): number => {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }
  const normalized = Number(value);
  const asString = normalized.toString();
  return Number(asString.replace(/\.0+$/, ""));
};

const SplitJobPopover: React.FC<SplitJobPopoverProps> = ({
  workspaceId,
  customFieldId,
  cardId,
  jmlTotal,
  onSuccess,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { templates, isLoading, isError, error, refetch, createTemplate, isCreating, deleteTemplate, isDeleting } =
    useSplitJobTemplates(workspaceId, customFieldId);
  const queryClient = useQueryClient();
  const {
    values,
    isLoading: isLoadingValues,
    createValue,
    updateValue,
    deleteValue,
    refetch: refetchValues,
  } = useSplitJobValues(undefined, cardId, customFieldId);

  const [messageApi, contextHolder] = message.useMessage();

  const normalizedJml = Number.isFinite(jmlTotal) ? jmlTotal : 0;

  const [draftValues, setDraftValues] = useState<Record<string, number>>({});

  const isAnyLoading = isLoading || isLoadingValues;

  const totalAmount = useMemo(
    () =>
      Object.values(draftValues).reduce((sum, value) => sum + normalizeNumberValue(value), 0),
    [draftValues]
  );

  const isTotalMatching =
    normalizedJml > 0 && Math.abs(totalAmount - normalizedJml) < 0.0001;

  const canSave =
    templates.length > 0 &&
    normalizedJml > 0 &&
    isTotalMatching &&
    !isSaving;

  useEffect(() => {
    if (open) {
      refetch();
      refetchValues();
    }
  }, [open, refetch, refetchValues]);

  useEffect(() => {
    if (!open) return;
    const nextValues: Record<string, number> = {};
    templates.forEach((template) => {
      const existing = values.find(
        (value) => value.split_job_template_id === template.id
      );
      nextValues[template.id] = existing
        ? normalizeNumberValue(existing.value)
        : 0;
    });
    setDraftValues(nextValues);
  }, [open, templates, values]);

  useEffect(() => {
    if (!open) {
      setNewTemplateName("");
    }
  }, [open]);

  const handleCreateTemplate = async () => {
    if (!customFieldId) return;
    if (!newTemplateName.trim()) return;
    try {
      await createTemplate(newTemplateName.trim());
      setNewTemplateName("");
      messageApi.success(`Template "${newTemplateName.trim()}" created`);
      if (open) {
        refetch();
      }
    } catch (error) {
      console.error("Failed to create template", error);
      messageApi.error("Failed to create template");
    }
  };

  const handleDeleteTemplate = async (
    templateId: string,
    templateName: string
  ) => {
    try {
      await deleteTemplate(templateId);
      messageApi.success(`Template "${templateName}" deleted`);
    } catch (error) {
      console.error("Failed to delete template", error);
      messageApi.error("Failed to delete template");
    }
  };

  const handleValueChange = (templateId: string, value: number | null) => {
    setDraftValues((prev) => ({
      ...prev,
      [templateId]: normalizeNumberValue(value),
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await Promise.all(
        templates.map(async (template) => {
          const targetValue = draftValues[template.id] ?? 0;
          const existingValue = values.find(
            (value) => value.split_job_template_id === template.id
          );
          if (targetValue === 0) {
            if (existingValue) {
              await deleteValue(existingValue.id);
            }
            return;
          }
          if (existingValue) {
            if (normalizeNumberValue(existingValue.value) !== targetValue) {
              await updateValue(existingValue.id, targetValue);
            }
          } else {
            await createValue({
              templateId: template.id,
              name: template.name.toLowerCase(),
              value: targetValue,
            });
          }
        })
      );
      if (onSuccess) {
        onSuccess();
      }
      await Promise.all([
        refetchValues(),
        refetch(),
        queryClient.invalidateQueries({
          queryKey: ["splitJobValuesByCustomField", cardId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["splitJobValuesByCustomField"],
        }),
      ]);
      messageApi.success("Split job values saved");
      setOpen(false);
    } catch (error) {
      console.error("Failed to save split jobs", error);
      messageApi.error("Failed to save split jobs");
    } finally {
      setIsSaving(false);
    }
  };

  const inputNumberDisabled = templates.length === 0 || isSaving;

  const content = (
    <div className="w-72">
      {contextHolder}
      <Title level={5}>Split Job Templates</Title>
      {isError && (
        <Text type="danger" className="block mb-2">
          {String(error)}
        </Text>
      )}
      <div className="mb-3">
        <Input
          placeholder="New template name"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          onPressEnter={handleCreateTemplate}
          suffix={
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleCreateTemplate}
              size="small"
              disabled={!newTemplateName.trim() || isCreating}
            />
          }
        />
      </div>
      <Divider className="my-2" />
      {isAnyLoading ? (
        <div className="flex justify-center py-4">
          <Spin />
        </div>
      ) : templates.length > 0 ? (
        <>
          <List
            size="small"
            dataSource={templates}
            renderItem={(template) => (
              <List.Item
                className="items-center"
                key={template.id}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                    loading={isDeleting}
                  />,
                ]}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div>
                    <Text strong>{template.name}</Text>
                    <Text type="secondary" className="block text-xs">
                      {template.custom_field_id}
                    </Text>
                  </div>
                  <InputNumber
                    min={0}
                    max={normalizedJml || undefined}
                    disabled={inputNumberDisabled}
                    value={draftValues[template.id] ?? 0}
                    onChange={(value) => handleValueChange(template.id, value)}
                    step={1}
                    className="w-24"
                  />
                </div>
              </List.Item>
            )}
          />
          <div className="flex items-center justify-between mt-3 text-sm">
            <Text>Total: {totalAmount} / {normalizedJml}</Text>
            {!isTotalMatching && normalizedJml > 0 ? (
              <Text type="danger">Jml Produksi belum sama</Text>
            ) : (
              <Text type="success">Ready to save</Text>
            )}
          </div>
          <Button
            type="primary"
            block
            onClick={handleSave}
            disabled={!canSave}
            loading={isSaving}
            className="mt-3"
          >
            Save Split Jobs
          </Button>
        </>
      ) : (
        <div className="text-xs text-gray-500">
          No split job templates found. Create one above to continue.
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Split Jobs"
      trigger="click"
      open={open}
      onOpenChange={(newOpen) => setOpen(newOpen)}
      placement="bottom"
    >
      {children}
    </Popover>
  );
};

export default SplitJobPopover;
