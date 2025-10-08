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
    console.log(`🔄 [useDebouncedCategoryUpdate] Starting debounced update for ${poProductCategoryId}: ${value}`);
    
    // Cancel any existing timeout for this category
    if (timeoutRefs.current[poProductCategoryId]) {
      clearTimeout(timeoutRefs.current[poProductCategoryId]);
      console.log(`⏰ [useDebouncedCategoryUpdate] Cancelled existing timeout for ${poProductCategoryId}`);
    }
    
    // Increment sequence counter and store the pending update with sequence
    const currentSequence = ++sequenceCounter.current;
    pendingUpdates.current[poProductCategoryId] = { value, sequence: currentSequence };
    
    console.log(`📝 [useDebouncedCategoryUpdate] Stored pending update for ${poProductCategoryId}: value=${value}, sequence=${currentSequence}`);
    
    // Clear any previous error for this category
    setErrorStates(prev => ({ ...prev, [poProductCategoryId]: null }));
    
    // Set new timeout
    timeoutRefs.current[poProductCategoryId] = setTimeout(() => {
      const pendingUpdate = pendingUpdates.current[poProductCategoryId];
      if (!pendingUpdate) {
        console.log(`⚠️ [useDebouncedCategoryUpdate] No pending update found for ${poProductCategoryId}`);
        return;
      }
      
      const { value: finalValue, sequence } = pendingUpdate;
      console.log(`🚀 [useDebouncedCategoryUpdate] Executing API call for ${poProductCategoryId}: value=${finalValue}, sequence=${sequence}`);
      
      // Set loading state
      setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: true }));
      
      updateMutation.mutate(
        { id: poProductCategoryId, data: { value: finalValue } },
        {
          onSuccess: () => {
            // Check if this response is still relevant (not superseded by a newer request)
            const currentPending = pendingUpdates.current[poProductCategoryId];
            if (currentPending && currentPending.sequence === sequence) {
              console.log(`✅ [useDebouncedCategoryUpdate] Success for ${poProductCategoryId}: sequence=${sequence} (current)`);
              delete pendingUpdates.current[poProductCategoryId];
              delete timeoutRefs.current[poProductCategoryId];
              setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductCategoryId]: null }));
              onSuccess?.();
            } else {
              console.log(`🔄 [useDebouncedCategoryUpdate] Ignoring outdated success for ${poProductCategoryId}: sequence=${sequence} (outdated)`);
            }
          },
          onError: (error) => {
            // Only handle error if this request is still current
            const currentPending = pendingUpdates.current[poProductCategoryId];
            if (currentPending && currentPending.sequence === sequence) {
              console.error(`❌ [useDebouncedCategoryUpdate] Error for ${poProductCategoryId}: sequence=${sequence}`, error);
              delete pendingUpdates.current[poProductCategoryId];
              delete timeoutRefs.current[poProductCategoryId];
              setLoadingStates(prev => ({ ...prev, [poProductCategoryId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductCategoryId]: error.message || 'Failed to save' }));
              onError?.(error);
            } else {
              console.log(`🔄 [useDebouncedCategoryUpdate] Ignoring outdated error for ${poProductCategoryId}: sequence=${sequence}`);
            }
          }
        }
      );
    }, delay);
  }, [updateMutation, delay, onSuccess, onError]);

  const cancelUpdate = useCallback((poProductCategoryId: string) => {
    console.log(`🛑 [useDebouncedCategoryUpdate] Cancelling update for ${poProductCategoryId}`);
    
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