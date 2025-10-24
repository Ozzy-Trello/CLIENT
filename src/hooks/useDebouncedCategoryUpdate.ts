import { useCallback, useRef, useState } from 'react';
import { useUpdatePOProductCategory } from './usePOProducts';

interface UseDebouncedCategoryUpdateOptions {
  delay?: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDebouncedCategoryUpdate = (options: UseDebouncedCategoryUpdateOptions = {}) => {
  const { delay = 1000, onSuccess, onError } = options;
  const updateMutation = useUpdatePOProductCategory();
  
  // Store timeout references for each category
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  
  // Store pending updates with sequence numbers to prevent race conditions
  const pendingUpdates = useRef<{ [key: string]: { value: number; sequence: number } }>({});
  
  // Global sequence counter to track request order
  const sequenceCounter = useRef<number>(0);
  
  // Track loading states for individual categories
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  
  // Track error states for individual categories
  const [errorStates, setErrorStates] = useState<{ [key: string]: string | null }>({});

  const debouncedUpdate = useCallback((poProductCategoryId: string, value: number) => {
    // Cancel any existing timeout for this category
    if (timeoutRefs.current[poProductCategoryId]) {
      clearTimeout(timeoutRefs.current[poProductCategoryId]);
    }
    
    // Increment sequence counter and store the pending update with sequence
    const currentSequence = ++sequenceCounter.current;
    pendingUpdates.current[poProductCategoryId] = { value, sequence: currentSequence };
    
    // Clear any previous error for this category
    setErrorStates(prev => ({ ...prev, [poProductCategoryId]: null }));
    
    // Set new timeout
    timeoutRefs.current[poProductCategoryId] = setTimeout(() => {
      const pendingUpdate = pendingUpdates.current[poProductCategoryId];
      if (!pendingUpdate) {
        return;
      }
      
      const { value: finalValue, sequence } = pendingUpdate;
      
      // Set loading state
      setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: true }));
      
      updateMutation.mutate(
        { id: poProductCategoryId, data: { value: finalValue } },
        {
          onSuccess: () => {
            // Check if this response is still relevant (not superseded by a newer request)
            const currentPending = pendingUpdates.current[poProductCategoryId];
            if (currentPending && currentPending.sequence === sequence) {
              delete pendingUpdates.current[poProductCategoryId];
              delete timeoutRefs.current[poProductCategoryId];
              setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductCategoryId]: null }));
              onSuccess?.();
            }
          },
          onError: (error) => {
            // Only handle error if this request is still current
            const currentPending = pendingUpdates.current[poProductCategoryId];
            if (currentPending && currentPending.sequence === sequence) {
              delete pendingUpdates.current[poProductCategoryId];
              delete timeoutRefs.current[poProductCategoryId];
              setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductCategoryId]: error.message || 'Failed to save' }));
              onError?.(error);
            }
          }
        }
      );
    }, delay);
  }, [updateMutation, delay, onSuccess, onError]);

  const cancelUpdate = useCallback((poProductCategoryId: string) => {
    // Cancel timeout
    if (timeoutRefs.current[poProductCategoryId]) {
      clearTimeout(timeoutRefs.current[poProductCategoryId]);
      delete timeoutRefs.current[poProductCategoryId];
    }
    
    // Clear pending update
    delete pendingUpdates.current[poProductCategoryId];
    
    // Clear loading state
    setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: false }));
  }, []);

  const isPending = useCallback((poProductCategoryId: string) => {
    return !!pendingUpdates.current[poProductCategoryId];
  }, []);

  const isLoading = useCallback((poProductCategoryId: string) => {
    return !!loadingStates[poProductCategoryId];
  }, [loadingStates]);

  const getError = useCallback((poProductCategoryId: string) => {
    return errorStates[poProductCategoryId];
  }, [errorStates]);

  const clearError = useCallback((poProductCategoryId: string) => {
    setErrorStates(prev => ({ ...prev, [poProductCategoryId]: null }));
  }, []);

  return {
    debouncedUpdate,
    cancelUpdate,
    isPending,
    isLoading,
    getError,
    clearError,
    isGlobalLoading: updateMutation.isPending
  };
};