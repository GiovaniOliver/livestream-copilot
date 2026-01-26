/**
 * Outputs Store
 *
 * Specialized store for managing AI-generated outputs with filtering and favorites.
 */

import { create } from "zustand";

export interface Output {
  id: string;
  category: string;
  title?: string;
  text: string;
  refs: string[];
  meta?: Record<string, unknown>;
  createdAt: number;
  isFavorite: boolean;
  isCopied: boolean;
}

interface OutputsState {
  outputs: Output[];
  favorites: Set<string>;
  copiedIds: Set<string>;
  categoryFilter: string | null;
  searchQuery: string;

  // Actions
  addOutput: (output: Omit<Output, "createdAt" | "isFavorite" | "isCopied">) => void;
  toggleFavorite: (id: string) => void;
  markCopied: (id: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearOutputs: () => void;
  reset: () => void;
}

const initialState = {
  outputs: [],
  favorites: new Set<string>(),
  copiedIds: new Set<string>(),
  categoryFilter: null,
  searchQuery: "",
};

export const useOutputsStore = create<OutputsState>((set) => ({
  ...initialState,

  addOutput: (output) =>
    set((state) => ({
      outputs: [
        {
          ...output,
          createdAt: Date.now(),
          isFavorite: false,
          isCopied: false,
        },
        ...state.outputs,
      ].slice(0, 200), // Keep max 200 outputs
    })),

  toggleFavorite: (id) =>
    set((state) => {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return {
        favorites: newFavorites,
        outputs: state.outputs.map((o) =>
          o.id === id ? { ...o, isFavorite: !o.isFavorite } : o
        ),
      };
    }),

  markCopied: (id) =>
    set((state) => {
      const newCopiedIds = new Set(state.copiedIds);
      newCopiedIds.add(id);
      return {
        copiedIds: newCopiedIds,
        outputs: state.outputs.map((o) =>
          o.id === id ? { ...o, isCopied: true } : o
        ),
      };
    }),

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearOutputs: () =>
    set({
      outputs: [],
      favorites: new Set(),
      copiedIds: new Set(),
    }),

  reset: () => set(initialState),
}));

/**
 * Selector for filtered outputs.
 */
export const selectFilteredOutputs = (state: OutputsState): Output[] => {
  let filtered = state.outputs;

  if (state.categoryFilter) {
    filtered = filtered.filter((o) => o.category === state.categoryFilter);
  }

  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.text.toLowerCase().includes(query) ||
        o.title?.toLowerCase().includes(query)
    );
  }

  return filtered;
};

/**
 * Selector for favorite outputs only.
 */
export const selectFavoriteOutputs = (state: OutputsState): Output[] => {
  return state.outputs.filter((o) => o.isFavorite);
};

/**
 * Selector for unique categories.
 */
export const selectCategories = (state: OutputsState): string[] => {
  const categories = new Set(state.outputs.map((o) => o.category));
  return Array.from(categories).sort();
};
