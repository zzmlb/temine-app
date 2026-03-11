import type { TerminalAPI, HistoryAPI, SettingsAPI, WindowAPI } from '../preload/preload';

declare global {
  interface Window {
    terminalAPI: TerminalAPI;
    historyAPI: HistoryAPI;
    settingsAPI: SettingsAPI;
    windowAPI: WindowAPI;
  }
}

export {};
