import { useMutation } from "@tanstack/react-query";
import { api } from "../api";

interface UpdateBoardParams {
  id: string;
  name?: string;
  description?: string;
  background?: string;
  roleIds?: string[];
}

export function useUpdateBoard() {
  return useMutation({
    mutationFn: async (data: UpdateBoardParams) => {
      const { id, ...updateData } = data;
      const response = await api.put(`/board/${id}`, updateData);
      return response.data;
    },
  });
}
