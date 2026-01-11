import { create } from "zustand";

type DashcardCountMap = Record<string, number>;

interface DashcardCountState {
  countsByWorkspace: Record<string, DashcardCountMap>;
  setCounts: (workspaceId: string, counts: DashcardCountMap) => void;
  setCount: (workspaceId: string, dashcardId: string, count: number) => void;
  getCount: (
    workspaceId?: string,
    dashcardId?: string
  ) => number | undefined;
  clearWorkspace: (workspaceId: string) => void;
}

export const useDashcardCountStore = create<DashcardCountState>((set, get) => ({
  countsByWorkspace: {},
  setCounts: (workspaceId, counts) =>
    set((state) => ({
      countsByWorkspace: {
        ...state.countsByWorkspace,
        [workspaceId]: {
          ...(state.countsByWorkspace[workspaceId] || {}),
          ...counts,
        },
      },
    })),
  setCount: (workspaceId, dashcardId, count) =>
    set((state) => ({
      countsByWorkspace: {
        ...state.countsByWorkspace,
        [workspaceId]: {
          ...(state.countsByWorkspace[workspaceId] || {}),
          [dashcardId]: count,
        },
      },
    })),
  getCount: (workspaceId, dashcardId) => {
    if (!workspaceId || !dashcardId) return undefined;
    return get().countsByWorkspace[workspaceId]?.[dashcardId];
  },
  clearWorkspace: (workspaceId) =>
    set((state) => {
      const next = { ...state.countsByWorkspace };
      delete next[workspaceId];
      return { countsByWorkspace: next };
    }),
}));
