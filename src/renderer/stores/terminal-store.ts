import { create } from 'zustand';
import type { AiState, TerminalInfo } from '../../shared/types';

interface TerminalStore {
  terminals: Record<string, TerminalInfo>;
  activeTerminalId: string | null;

  addTerminal: (info: TerminalInfo) => void;
  removeTerminal: (id: string) => void;
  setLabel: (id: string, label: string) => void;
  setAiState: (id: string, state: AiState) => void;
  setActiveTerminal: (id: string | null) => void;
  reorderTerminals: (orderedIds: string[]) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  terminals: {},
  activeTerminalId: null,

  addTerminal: (info) =>
    set((state) => ({
      terminals: { ...state.terminals, [info.id]: info },
      activeTerminalId: info.id,
    })),

  removeTerminal: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.terminals;
      const remaining = Object.keys(rest);
      return {
        terminals: rest,
        activeTerminalId:
          state.activeTerminalId === id
            ? remaining[remaining.length - 1] || null
            : state.activeTerminalId,
      };
    }),

  setLabel: (id, label) =>
    set((state) => {
      const info = state.terminals[id];
      if (!info) return state;
      return { terminals: { ...state.terminals, [id]: { ...info, label } } };
    }),

  setAiState: (id, aiState) =>
    set((state) => {
      const info = state.terminals[id];
      if (!info) return state;
      return { terminals: { ...state.terminals, [id]: { ...info, aiState } } };
    }),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  reorderTerminals: (orderedIds) =>
    set((state) => {
      const newTerminals = { ...state.terminals };
      orderedIds.forEach((id, index) => {
        if (newTerminals[id]) {
          newTerminals[id] = { ...newTerminals[id], order: index };
        }
      });
      return { terminals: newTerminals };
    }),
}));
