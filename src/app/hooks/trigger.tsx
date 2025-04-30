// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { ApiResponse } from "../dto/types";
// import { api } from "../api";

// export function useTriggers() {
//   const queryClient = useQueryClient();
  
//   // Main query for triggers
//   const triggersQuery = useQuery({
//     queryKey: ["triggers"],
//     queryFn: () => triggers(),
//     staleTime: 5000,
//   });

//   // Create new trigger mutation with optimistic updates
//   const createTriggerMutation = useMutation({
//     mutationFn: ({ trigger }: { trigger: Partial<Trigger> }) => {
//       return api.post(`/trigger`, trigger);
//     },
//     onMutate: async ({ trigger }) => {
//       // Cancel any outgoing refetches
//       await queryClient.cancelQueries({ queryKey: ["triggers"] });
      
//       // Snapshot previous value
//       const previousTriggers = queryClient.getQueryData(["triggers"]);
      
//       // Create temporary trigger for optimistic update
//       const tempTrigger = {
//         ...trigger,
//         id: trigger.id || `temp-trigger-${Date.now()}`,
//         createdAt: new Date().toISOString(),
//       };
      
//       // Update the UI optimistically
//       queryClient.setQueryData(
//         ["triggers"],
//         (old: ApiResponse<Trigger[]> | undefined) => {
//           if (!old) return { data: [tempTrigger] };
//           return {
//             ...old,
//             data: [...(old.data ?? []), tempTrigger]
//           };
//         }
//       );
      
//       return { previousTriggers };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousTriggers) {
//         queryClient.setQueryData(["triggers"], context.previousTriggers);
//       }
//       // Optionally show an error message
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["triggers"] });
//     },
//   });

//   // Update trigger mutation
//   const updateTriggerMutation = useMutation({
//     mutationFn: ({ 
//       triggerId, 
//       updates 
//     }: { 
//       triggerId: string; 
//       updates: Partial<Trigger>; 
//     }) => {
//       return api.put(`/trigger/${triggerId}`, updates);
//     },
//     onMutate: async ({ triggerId, updates }) => {
//       await queryClient.cancelQueries({ queryKey: ["triggers"] });
      
//       const previousTriggers = queryClient.getQueryData(["triggers"]);
      
//       // Update the UI optimistically
//       queryClient.setQueryData(
//         ["triggers"],
//         (old: ApiResponse<Trigger[]> | undefined) => {
//           if (!old) return { data: [] };
          
//           return {
//             ...old,
//             data: (old.data ?? []).map(trigger =>
//               trigger.id === triggerId ? { ...trigger, ...updates } : trigger
//             )
//           };
//         }
//       );
      
//       return { previousTriggers };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousTriggers) {
//         queryClient.setQueryData(["triggers"], context.previousTriggers);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["triggers"] });
//     },
//   });

//   // Delete trigger mutation
//   const deleteTriggerMutation = useMutation({
//     mutationFn: ({ triggerId }: { triggerId: string }) => {
//       return api.delete(`/trigger/${triggerId}`);
//     },
//     onMutate: async ({ triggerId }) => {
//       await queryClient.cancelQueries({ queryKey: ["triggers"] });
      
//       const previousTriggers = queryClient.getQueryData(["triggers"]);
      
//       // Remove the trigger optimistically
//       queryClient.setQueryData(
//         ["triggers"],
//         (old: ApiResponse<Trigger[]> | undefined) => {
//           if (!old) return { data: [] };
          
//           return {
//             ...old,
//             data: (old.data ?? []).filter(trigger => trigger.id !== triggerId)
//           };
//         }
//       );
      
//       return { previousTriggers };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousTriggers) {
//         queryClient.setQueryData(["triggers"], context.previousTriggers);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["triggers"] });
//     },
//   });

//   // Create a wrapper function that returns a promise for createTrigger
//   const createTrigger = (variables: Partial<Trigger>) => {
//     return new Promise((resolve, reject) => {
//       createTriggerMutation.mutate({ trigger: variables }, {
//         onSuccess: (data) => resolve(data),
//         onError: (error) => reject(error)
//       });
//     });
//   };

//   // Create a wrapper function that returns a promise for updateTrigger
//   const updateTrigger = (variables: Partial<Trigger>) => {
//     const { id, ...updates } = variables;
//     if (!id) throw new Error('Trigger ID is required for update');
    
//     return new Promise((resolve, reject) => {
//       updateTriggerMutation.mutate({ 
//         triggerId: id,
//         updates 
//       }, {
//         onSuccess: (data) => resolve(data),
//         onError: (error) => reject(error)
//       });
//     });
//   };

//   // Create a wrapper function that returns a promise for deleteTrigger
//   const deleteTrigger = (variables: { triggerId: string }) => {
//     return new Promise((resolve, reject) => {
//       deleteTriggerMutation.mutate(variables, {
//         onSuccess: (data) => resolve(data),
//         onError: (error) => reject(error)
//       });
//     });
//   };

//   return {
//     triggers: triggersQuery.data?.data || [],
//     isLoading: triggersQuery.isLoading,
//     isError: triggersQuery.isError,
//     error: triggersQuery.error,
//     createTrigger,
//     updateTrigger,
//     deleteTrigger,
//     isCreatingTrigger: createTriggerMutation.isPending,
//     isUpdatingTrigger: updateTriggerMutation.isPending,
//     isDeletingTrigger: deleteTriggerMutation.isPending,
//   };
// }

// // Single trigger details hook for more focused operations
// export function useTriggerDetails(triggerId: string) {
//   const queryClient = useQueryClient();

//   const triggerDetailsQuery = useQuery({
//     queryKey: ["trigger", triggerId],
//     queryFn: () => api.get(`/trigger/${triggerId}`).then(res => res.data),
//     enabled: !!triggerId,
//     staleTime: 5000,
//     // Use any trigger data we might already have from the triggers query
//     initialData: () => {
//       const triggersData = queryClient.getQueryData<ApiResponse<Trigger[]>>(["triggers"]);
//       if (!triggersData) return undefined;
      
//       const foundTrigger = triggersData.data?.find(trigger => trigger.id === triggerId);
//       return foundTrigger ? { data: foundTrigger } : undefined;
//     },
//   });

//   // Mutation for updating the trigger
//   const updateTriggerMutation = useMutation({
//     mutationFn: (updates: Partial<Trigger>) => {
//       return api.put(`/trigger/${triggerId}`, updates);
//     },
//     // Optimistic update
//     onMutate: async (updates) => {
//       await queryClient.cancelQueries({ queryKey: ["trigger", triggerId] });
      
//       const previousTrigger = queryClient.getQueryData(["trigger", triggerId]);
      
//       // Update the individual trigger
//       queryClient.setQueryData(
//         ["trigger", triggerId],
//         (old: ApiResponse<Trigger> | undefined) => {
//           if (!old) return { data: { ...updates, id: triggerId } as Trigger };
//           return {
//             ...old,
//             data: { ...old.data, ...updates }
//           };
//         }
//       );
      
//       // Also update the trigger in the triggers collection if it exists
//       queryClient.setQueryData(
//         ["triggers"],
//         (old: ApiResponse<Trigger[]> | undefined) => {
//           if (!old) return { data: [] };
          
//           return {
//             ...old,
//             data: (old.data ?? []).map(trigger =>
//               trigger.id === triggerId ? { ...trigger, ...updates } : trigger
//             )
//           };
//         }
//       );
      
//       return { previousTrigger };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousTrigger) {
//         queryClient.setQueryData(["trigger", triggerId], context.previousTrigger);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["trigger", triggerId] });
//       queryClient.invalidateQueries({ queryKey: ["triggers"] });
//     },
//   });

//   // Mutation for deleting the trigger
//   const deleteTriggerMutation = useMutation({
//     mutationFn: () => {
//       return api.delete(`/trigger/${triggerId}`);
//     },
//     onMutate: async () => {
//       await queryClient.cancelQueries({ queryKey: ["triggers"] });
      
//       const previousTriggers = queryClient.getQueryData(["triggers"]);
      
//       // Optimistically remove the trigger from the triggers collection
//       queryClient.setQueryData(
//         ["triggers"],
//         (old: ApiResponse<Trigger[]> | undefined) => {
//           if (!old) return { data: [] };
          
//           return {
//             ...old,
//             data: (old.data ?? []).filter(trigger => trigger.id !== triggerId)
//           };
//         }
//       );
      
//       return { previousTriggers };
//     },
//     onError: (err, variables, context) => {
//       if (context?.previousTriggers) {
//         queryClient.setQueryData(["triggers"], context.previousTriggers);
//       }
//     },
//     onSettled: () => {
//       queryClient.invalidateQueries({ queryKey: ["triggers"] });
//     },
//   });

//   // Create a wrapper function that returns a promise for updateTrigger
//   const updateTrigger = (updates: Partial<Trigger>) => {
//     return new Promise((resolve, reject) => {
//       updateTriggerMutation.mutate(updates, {
//         onSuccess: (data) => resolve(data),
//         onError: (error) => reject(error)
//       });
//     });
//   };

//   // Create a wrapper function that returns a promise for deleteTrigger
//   const deleteTrigger = () => {
//     return new Promise((resolve, reject) => {
//       deleteTriggerMutation.mutate(void 0, {
//         onSuccess: (data) => resolve(data),
//         onError: (error) => reject(error)
//       });
//     });
//   };

//   return {
//     trigger: triggerDetailsQuery.data?.data,
//     isLoading: triggerDetailsQuery.isLoading,
//     isError: triggerDetailsQuery.isError,
//     error: triggerDetailsQuery.error,
//     updateTrigger,
//     isUpdating: updateTriggerMutation.isPending,
//     deleteTrigger,
//     isDeleting: deleteTriggerMutation.isPending,
//   };
// }