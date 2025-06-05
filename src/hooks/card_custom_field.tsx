import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cardCustomFields,
  setCardCustomFieldValue,
} from "../api/card_custom_field";
import { ApiResponse } from "../types/type";
import { CardCustomField } from "@myTypes/card";
import {
  EnumCustomFieldSource,
  EnumCustomFieldType,
} from "@myTypes/custom-field";

export const useCardCustomField = (cardId: string, workspaceId: string) => {
  const queryClient = useQueryClient();

  // Main query for card custom fields
  const cardCustomFieldQuery = useQuery({
    queryKey: ["cardCustomField", cardId, workspaceId],
    queryFn: () => cardCustomFields(cardId, workspaceId),
    enabled: !!cardId && !!workspaceId,
    staleTime: 5000,
  });

  // Set card custom field value mutation with optimistic update
  const setValueMutation = useMutation({
    mutationFn: ({
      customFieldId,
      updatedData,
    }: {
      customFieldId: string;
      updatedData: Partial<CardCustomField>;
    }) =>
      setCardCustomFieldValue(workspaceId, cardId, customFieldId, updatedData),
    onMutate: async ({ customFieldId, updatedData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["cardCustomField", cardId, workspaceId],
      });

      // Snapshot the previous value
      const previousCardCustomFields = queryClient.getQueryData<
        ApiResponse<CardCustomField[]>
      >(["cardCustomField", cardId, workspaceId]);

      // Optimistically update to the new value
      if (previousCardCustomFields?.data) {
        const updatedFields = previousCardCustomFields.data.map((field) => {
          const isMatch = field.id === customFieldId;

          return isMatch ? { ...field, ...updatedData } : field;
        });

        // If the field doesn't exist yet, create it
        const fieldExists = previousCardCustomFields.data.some(
          (field) => field.id === customFieldId
        );

        if (!fieldExists) {
          const newField: CardCustomField = {
            id: customFieldId,
            cardId,
            ...updatedData,
          };

          updatedFields.push(newField);
        }

        queryClient.setQueryData<ApiResponse<CardCustomField[]>>(
          ["cardCustomField", cardId, workspaceId],
          {
            ...previousCardCustomFields,
            data: updatedFields,
          }
        );
      }

      // Return a context object with the snapshotted value
      return { previousCardCustomFields };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCardCustomFields) {
        queryClient.setQueryData(
          ["cardCustomField", cardId, workspaceId],
          context.previousCardCustomFields
        );
      }
    },
    onSuccess: (data) => {
      // Update with the actual server response
      if (data?.data) {
        queryClient.setQueryData<ApiResponse<CardCustomField[]>>(
          ["cardCustomField", cardId, workspaceId],
          data
        );
      }
    },
    // Remove onSettled to prevent unnecessary refetches that override our data
    // onSettled: () => {
    //   queryClient.invalidateQueries({
    //     queryKey: ["cardCustomField", cardId, workspaceId]
    //   });
    // },
  });

  // Helper function to set string value
  const setStringValue = (customFieldId: string, value: string) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueString: value,
        // Don't clear other fields - let the backend handle this
        // The backend should return the complete updated record
      },
    });
  };

  // Helper function to set number value
  const setNumberValue = (customFieldId: string, value: number) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueNumber: value,
      },
    });
  };

  // Helper function to set option value
  const setOptionValue = (customFieldId: string, value: string) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueOption: value,
      },
    });
  };

  // Helper function to set checkbox value
  const setCheckboxValue = (customFieldId: string, value: boolean) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueCheckbox: value,
      },
    });
  };

  // Helper function to set date value
  const setDateValue = (customFieldId: string, value: Date) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueDate: value,
      },
    });
  };

  // Helper function to set user ID value
  const setUserValue = (customFieldId: string, value: string) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: {
        valueUserId: value,
      },
    });
  };

  // Generic helper to set value based on type
  const setValue = (
    customFieldId: string,
    value: any,
    source: EnumCustomFieldSource,
    type: EnumCustomFieldType
  ) => {
    switch (type) {
      case EnumCustomFieldType.Text:
        setStringValue(customFieldId, value);
        break;
      case EnumCustomFieldType.Number:
        setNumberValue(customFieldId, Number(value));
        break;
      case EnumCustomFieldType.Dropdown:
        setOptionValue(customFieldId, value);
        break;
      case EnumCustomFieldType.Checkbox:
        setCheckboxValue(customFieldId, Boolean(value));
        break;
      case EnumCustomFieldType.Date:
        setDateValue(
          customFieldId,
          value instanceof Date ? value : new Date(value)
        );
        break;
      default:
        if (source === EnumCustomFieldSource.User) {
          setUserValue(customFieldId, value);
        } else {
          console.warn(`Unknown custom field type: ${type}`);
        }
    }
  };

  // Helper function to get the actual value regardless of type
  const getValue = (customFieldId: string): any => {
    const field = cardCustomFieldQuery.data?.data?.find(
      (field) => field.id === customFieldId
    );

    if (!field) return null;

    // Return the appropriate value based on what's set
    if (
      field.valueString !== undefined &&
      field.valueString !== null &&
      field.valueString !== ""
    )
      return field.valueString;
    if (field.valueNumber !== undefined && field.valueNumber !== null)
      return field.valueNumber;
    if (
      field.valueOption !== undefined &&
      field.valueOption !== null &&
      field.valueOption !== ""
    )
      return field.valueOption;
    if (field.valueCheckbox !== undefined && field.valueCheckbox !== null)
      return field.valueCheckbox;
    if (field.valueDate !== undefined && field.valueDate !== null)
      return field.valueDate;
    if (
      field.valueUserId !== undefined &&
      field.valueUserId !== null &&
      field.valueUserId !== ""
    )
      return field.valueUserId;

    return null;
  };

  // Helper function to get a specific custom field
  const getCustomField = (
    customFieldId: string
  ): CardCustomField | undefined => {
    const field = cardCustomFieldQuery.data?.data?.find(
      (field) => field.id === customFieldId
    );
    return field;
  };

  // Helper function to get specific value types
  const getStringValue = (customFieldId: string): string | null => {
    const field = getCustomField(customFieldId);
    const value = field?.valueString || null;
    return value;
  };

  const getNumberValue = (customFieldId: string): number | null => {
    const field = getCustomField(customFieldId);
    return field?.valueNumber || null;
  };

  const getOptionValue = (customFieldId: string): string | null => {
    const field = getCustomField(customFieldId);
    return field?.valueOption || null;
  };

  const getCheckboxValue = (customFieldId: string): boolean | null => {
    const field = getCustomField(customFieldId);
    return field?.valueCheckbox || null;
  };

  const getDateValue = (customFieldId: string): Date | null => {
    const field = getCustomField(customFieldId);
    return field?.valueDate || null;
  };

  const getUserValue = (customFieldId: string): string | null => {
    const field = getCustomField(customFieldId);
    return field?.valueUserId || null;
  };

  // Helper function to update multiple properties of a custom field
  const updateCustomField = (
    customFieldId: string,
    updates: Partial<CardCustomField>
  ) => {
    setValueMutation.mutate({
      customFieldId,
      updatedData: updates,
    });
  };

  // Helper function to check if a custom field has any value
  const hasValue = (customFieldId: string): boolean => {
    const field = getCustomField(customFieldId);
    if (!field) return false;

    return !!(
      (field.valueString && field.valueString !== "") ||
      field.valueNumber !== undefined ||
      (field.valueOption && field.valueOption !== "") ||
      field.valueCheckbox !== undefined ||
      field.valueDate ||
      (field.valueUserId && field.valueUserId !== "")
    );
  };

  return {
    // Query data and state
    cardCustomFields: cardCustomFieldQuery.data?.data || [],
    isLoading: cardCustomFieldQuery.isLoading,
    isError: cardCustomFieldQuery.isError,
    error: cardCustomFieldQuery.error,

    // Type-specific value setters
    setStringValue,
    setNumberValue,
    setOptionValue,
    setCheckboxValue,
    setDateValue,
    setUserValue,
    setValue, // Generic setter based on type

    // Value getters
    getValue, // Generic getter
    getStringValue,
    getNumberValue,
    getOptionValue,
    getCheckboxValue,
    getDateValue,
    getUserValue,

    // General mutations
    updateCustomField,

    // Mutation states
    isUpdating: setValueMutation.isPending,
    updateError: setValueMutation.error,

    // Helper functions
    getCustomField,
    hasValue,

    // Async versions for when you need promises
    setValueAsync: setValueMutation.mutateAsync,

    // Raw mutation for advanced usage
    setValueMutation: setValueMutation.mutate,

    // For debugging
    refetch: cardCustomFieldQuery.refetch,
  };
};
