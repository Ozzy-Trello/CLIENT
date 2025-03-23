import { useMutation, useQueryClient } from "@tanstack/react-query"
import { uploadFile } from "../api/filter";

export const useUploadFile = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["files", cardId]
      })
    }
  })
}