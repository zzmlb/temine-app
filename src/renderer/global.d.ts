import type {
  TerminalAPI,
  HistoryAPI,
  SettingsAPI,
  WindowAPI,
  FloatingButtonAPI,
} from '../preload/preload';

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
    historyAPI: HistoryAPI;
    settingsAPI: SettingsAPI;
    windowAPI: WindowAPI;
    floatingButtonAPI: FloatingButtonAPI;
  }
}

export {};
