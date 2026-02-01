import { useCallback, useRef, useState } from 'react';
import { useUpdatePOProduct } from './usePOProducts';
import { UpdatePOProductRequest } from '../api/po-product';

interface UseDebouncedPOProductUpdateOptions {
  delay?: number;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export const useDebouncedPOProductUpdate = (options: UseDebouncedPOProductUpdateOptions = {}) => {
  const { delay = 1000, onSuccess, onError } = options;
  const updateMutation = useUpdatePOProduct();
  
  // Store timeout references for each product
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});
  
  // Store pending updates with sequence numbers to prevent race conditions
  const pendingUpdates = useRef<{ [key: string]: { data: UpdatePOProductRequest; sequence: number } }>({});
  
  // Global sequence counter to track request order
  const sequenceCounter = useRef<number>(0);
  
  // Track loading states for individual products
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  
  // Track error states for individual products
  const [errorStates, setErrorStates] = useState<{ [key: string]: string | null }>({});

  const debouncedUpdate = useCallback((poProductId: string, data: UpdatePOProductRequest) => {
    // Cancel any existing timeout for this product
    if (timeoutRefs.current[poProductId]) {
      clearTimeout(timeoutRefs.current[poProductId]);
    }
    
    // Increment sequence counter and store the pending update with sequence
    const currentSequence = ++sequenceCounter.current;
    
    // Merge with existing pending data to avoid overwriting other fields
    const existingPending = pendingUpdates.current[poProductId];
    const mergedData = existingPending ? { ...existingPending.data, ...data } : data;
    
    pendingUpdates.current[poProductId] = { data: mergedData, sequence: currentSequence };
    
    // Clear any previous error for this product
    setErrorStates(prev => ({ ...prev, [poProductId]: null }));
    
    // Set new timeout
    timeoutRefs.current[poProductId] = setTimeout(() => {
      const pendingUpdate = pendingUpdates.current[poProductId];
      if (!pendingUpdate) {
        return;
      }
      
      const { data: finalData, sequence } = pendingUpdate;
      
      // Set loading state
      setLoadingStates(prev => ({ ...prev, [poProductId]: true }));
      
      updateMutation.mutate(
        { id: poProductId, data: finalData },
        {
          onSuccess: () => {
            // Check if this response is still relevant (not superseded by a newer request)
            const currentPending = pendingUpdates.current[poProductId];
            if (currentPending && currentPending.sequence === sequence) {
              delete pendingUpdates.current[poProductId];
              delete timeoutRefs.current[poProductId];
              setLoadingStates(prev => ({ ...prev, [poProductId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductId]: null }));
              onSuccess?.();
            }
          },
          onError: (error) => {
            // Only handle error if this request is still current
            const currentPending = pendingUpdates.current[poProductId];
            if (currentPending && currentPending.sequence === sequence) {
              delete pendingUpdates.current[poProductId];
              delete timeoutRefs.current[poProductId];
              setLoadingStates(prev => ({ ...prev, [poProductId]: false }));
              setErrorStates(prev => ({ ...prev, [poProductId]: error.message || 'Failed to save' }));
              onError?.(error);
            }
          }
        }
      );
    }, delay);
  }, [updateMutation, delay, onSuccess, onError]);

  const cancelUpdate = useCallback((poProductId: string) => {
    // Cancel timeout
    if (timeoutRefs.current[poProductId]) {
      clearTimeout(timeoutRefs.current[poProductId]);
      delete timeoutRefs.current[poProductId];
    }
    
    // Clear pending update
    delete pendingUpdates.current[poProductId];
    
    // Clear loading state
    setLoadingStates(prev => ({ ...prev, [poProductId]: false }));
  }, []);

  const isPending = useCallback((poProductId: string) => {
    return !!pendingUpdates.current[poProductId];
  }, []);

  const isLoading = useCallback((poProductId: string) => {
    return !!loadingStates[poProductId];
  }, [loadingStates]);

  const getError = useCallback((poProductId: string) => {
    return errorStates[poProductId];
  }, [errorStates]);

  const clearError = useCallback((poProductId: string) => {
    setErrorStates(prev => ({ ...prev, [poProductId]: null }));
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