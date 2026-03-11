import { create } from 'zustand';

interface LayoutStore {
  columns: number;
  historyPanelOpen: boolean;
  settingsPanelOpen: boolean;

  setColumns: (columns: number) => void;
  toggleHistoryPanel: () => void;
  toggleSettingsPanel: () => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  columns: 2,
  historyPanelOpen: false,
  settingsPanelOpen: false,

  setColumns: (columns) => set({ columns: Math.max(1, Math.min(5, columns)) }),
  toggleHistoryPanel: () => set((s) => ({ historyPanelOpen: !s.historyPanelOpen })),
  toggleSettingsPanel: () => set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen })),
}));
