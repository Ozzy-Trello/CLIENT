import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getSplitJobTemplates, 
  getSplitJobValues, 
  createSplitJobTemplate, 
  createSplitJobValue,
  updateSplitJobValue,
  deleteSplitJobValue,
  deleteSplitJobTemplate,
  getSplitJobValuesByCustomField,
  getAllSplitJobs,
  SplitJobTemplate,
  SplitJobValue,
  SplitJobGroup,
  SplitJobCardGroup,
  SplitJobCardGroupItem,
  GroupedSplitJobValues
} from '@api/split_job';

// Types are exported from the API file

export const useSplitJobTemplates = (workspaceId: string, customFieldId?: string) => {
  const queryClient = useQueryClient();
  
  // Query for templates
  const templatesQuery = useQuery({
    queryKey: ['splitJobTemplates', workspaceId, customFieldId],
    queryFn: () => getSplitJobTemplates(workspaceId, customFieldId),
    select: (data) => data.data || [],
  });

  // Mutation for creating a template
  const createTemplateMutation = useMutation({
    mutationFn: (name: string) => {
      return createSplitJobTemplate({
        name,
        workspace_id: workspaceId,
        custom_field_id: customFieldId || '',
      });
    },
    onSuccess: () => {
      // Invalidate the templates query to refetch
      queryClient.invalidateQueries({ queryKey: ['splitJobTemplates', workspaceId, customFieldId] });
    },
  });
  
  // Mutation for deleting a template
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => {
      return deleteSplitJobTemplate(templateId);
    },
    onSuccess: () => {
      // Invalidate both templates and values queries
      queryClient.invalidateQueries({ queryKey: ['splitJobTemplates', workspaceId, customFieldId] });
      queryClient.invalidateQueries({ queryKey: ['splitJobValues'] });
      queryClient.invalidateQueries({ queryKey: ['splitJobValuesByCustomField'] });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    createTemplate: (name: string) => createTemplateMutation.mutateAsync(name),
    isCreating: createTemplateMutation.isPending,
    deleteTemplate: (templateId: string) => deleteTemplateMutation.mutateAsync(templateId),
    isDeleting: deleteTemplateMutation.isPending,
  };
};

export const useSplitJobValues = (templateId?: string, cardId?: string, customFieldId?: string) => {
  const queryClient = useQueryClient();
  
  // Query for values
  const valuesQuery = useQuery({
    queryKey: ['splitJobValues', templateId, cardId, customFieldId],
    queryFn: async () => {
      const response = await getSplitJobValues({ 
        split_job_template_id: templateId, 
        card_id: cardId,
        custom_field_id: customFieldId 
      });
      return response;
    },
    select: (data) => {
      return data.data || [];
    },
    // Enable if we have at least cardId (to get all values for a card) or templateId
    enabled: !!(cardId || templateId),
  });

  // Mutation for creating a value
  const createValueMutation = useMutation({
    mutationFn: ({ templateId, name, value }: { templateId: string, name: string, value: number }) => {
      return createSplitJobValue({
        name,
        split_job_template_id: templateId,
        card_id: cardId || '',
        custom_field_id: customFieldId || '',
        value,
      });
    },
    onSuccess: () => {
      // Invalidate the values query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
    },
  });

  // Mutation for updating a value
  const updateValueMutation = useMutation({
    mutationFn: ({ id, value }: { id: string, value: number }) => {
      return updateSplitJobValue(id, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
    },
  });

  // Mutation for deleting a value
  const deleteValueMutation = useMutation({
    mutationFn: (id: string) => {
      return deleteSplitJobValue(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
    },
  });

  return {
    values: valuesQuery.data || [],
    isLoading: valuesQuery.isLoading,
    isError: valuesQuery.isError,
    error: valuesQuery.error,
    refetch: valuesQuery.refetch,
    createValue: (params: { templateId: string, name: string, value: number }) => 
      createValueMutation.mutateAsync(params),
    updateValue: (id: string, value: number) => 
      updateValueMutation.mutateAsync({ id, value }),
    deleteValue: (id: string) => 
      deleteValueMutation.mutateAsync(id),
    isCreating: createValueMutation.isPending,
    isUpdating: updateValueMutation.isPending,
    isDeleting: deleteValueMutation.isPending,
  };
};

/**
 * Hook to fetch split job values grouped by custom field name
 * This simplifies the frontend by having the backend handle the grouping
 */
export const useSplitJobValuesByCustomField = (cardId?: string) => {
  const queryClient = useQueryClient();
  
  // Query for grouped values
  const groupedValuesQuery = useQuery({
    queryKey: ['splitJobValuesByCustomField', cardId],
    queryFn: async () => {
      if (!cardId) return { data: {} };
      const response = await getSplitJobValuesByCustomField(cardId);
      return response;
    },
    select: (data) => {
      return data.data || {};
    },
    enabled: !!cardId,
  });

  // Mutation for creating a value
  const createValueMutation = useMutation({
    mutationFn: ({ templateId, name, value }: { templateId: string, name: string, value: number }) => {
      return createSplitJobValue({
        name,
        split_job_template_id: templateId,
        card_id: cardId || '',
        custom_field_id: '', // This will be filled by the backend based on the template
        value,
      });
    },
    onSuccess: () => {
      // Invalidate both queries to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValuesByCustomField']
      });
    },
  });

  // Mutation for updating a value
  const updateValueMutation = useMutation({
    mutationFn: ({ id, value }: { id: string, value: number }) => {
      return updateSplitJobValue(id, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValuesByCustomField']
      });
    },
  });

  // Mutation for deleting a value
  const deleteValueMutation = useMutation({
    mutationFn: (id: string) => {
      return deleteSplitJobValue(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValues']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['splitJobValuesByCustomField']
      });
    },
  });

  return {
    groupedValues: groupedValuesQuery.data || {},
    isLoading: groupedValuesQuery.isLoading,
    isError: groupedValuesQuery.isError,
    error: groupedValuesQuery.error,
    refetch: groupedValuesQuery.refetch,
    createValue: (params: { templateId: string, name: string, value: number }) => 
      createValueMutation.mutateAsync(params),
    updateValue: (id: string, value: number) => 
      updateValueMutation.mutateAsync({ id, value }),
    deleteValue: (id: string) => 
      deleteValueMutation.mutateAsync(id),
    isCreating: createValueMutation.isPending,
    isUpdating: updateValueMutation.isPending,
    isDeleting: deleteValueMutation.isPending,
  };
};

export const useAllSplitJobs = (workspaceId?: string) => {
  return useQuery<SplitJobCardGroup[]>({
    queryKey: ['allSplitJobs', workspaceId],
    queryFn: async () => {
      const res = await getAllSplitJobs(workspaceId);
      const groups = (res.data || []) as any[];

      const cardMap = new Map<string, SplitJobCardGroup>();

      const parseNumber = (val: any): number | null => {
        if (val === null || val === undefined) return null;
        if (typeof val === "number" && Number.isFinite(val)) return val;
        const num = Number(String(val).replace(/,/g, ""));
        return Number.isFinite(num) ? num : null;
      };

      groups.forEach((rawGroup) => {
        const group: SplitJobGroup = {
          custom_field_id: rawGroup.custom_field_id ?? rawGroup.customFieldId,
          custom_field_name: rawGroup.custom_field_name ?? rawGroup.customFieldName,
          values: rawGroup.values || [],
        };

        (group.values || []).forEach((v: any) => {
          const value = v ?? {};
          const item: SplitJobCardGroupItem = {
            id: value.id,
            name: value.name,
            value: parseNumber(value.value),
            templateId: value.split_job_template_id ?? value.splitJobTemplateId,
            templateName: value.template_name ?? value.templateName ?? undefined,
            customFieldId: value.custom_field_id ?? value.customFieldId,
            customFieldName:
              value.custom_field_name ??
              value.customFieldName ??
              group.custom_field_name,
            createdAt: value.created_at ?? value.createdAt ?? null,
            updatedAt: value.updated_at ?? value.updatedAt ?? null,
          };

          const cardId = value.card_id ?? value.cardId ?? null;
          const key = cardId || value.card_name || value.cardName || "unknown-card";
          const existing = cardMap.get(key);
          if (!existing) {
            cardMap.set(key, {
              cardId,
              cardName: value.card_name ?? value.cardName ?? "Unknown Card",
              boardId: value.board_id ?? value.boardId ?? null,
              boardName: value.board_name ?? value.boardName ?? null,
              listId: value.list_id ?? value.listId ?? null,
              listName: value.list_name ?? value.listName ?? null,
              dueDate: value.card_due_date ?? value.cardDueDate ?? null,
              items: [item],
            });
          } else {
            existing.items.push(item);
          }
        });
      });

      return Array.from(cardMap.values());
    },
    staleTime: 2 * 60 * 1000,
  });
};
