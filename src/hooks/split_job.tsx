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
  SplitJobTemplate,
  SplitJobValue,
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
      console.log('Raw API response for split job values:', response);
      return response;
    },
    select: (data) => {
      console.log('Selecting data from response:', data);
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
      console.log('Raw API response for grouped split job values:', response);
      return response;
    },
    select: (data) => {
      console.log('Selecting grouped data from response:', data);
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
